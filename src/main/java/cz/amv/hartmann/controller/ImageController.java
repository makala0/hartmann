package cz.amv.hartmann.controller;

import cz.amv.hartmann.service.FtpImageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ImageController {

    private static final String IMAGE_API_PREFIX = "/api/images/";
    private static final String CHECK_API_PREFIX = "/api/images/check/";

    private final FtpImageService ftpImageService;

    public ImageController(FtpImageService ftpImageService) {
        this.ftpImageService = ftpImageService;
    }

    @GetMapping("/check/**")
    public ResponseEntity<Map<String, Boolean>> checkImage(HttpServletRequest request) {
        try {
            String imagePath = extractImagePath(request, CHECK_API_PREFIX);
            return ResponseEntity.ok(Map.of("exists", ftpImageService.exists(imagePath)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("exists", false));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("exists", false));
        }
    }

    @GetMapping("/**")
    public ResponseEntity<Resource> getImage(HttpServletRequest request) {
        try {
            String imagePath = extractImagePath(request, IMAGE_API_PREFIX);
            FtpImageService.FtpImage image = ftpImageService.loadImage(imagePath);

            if (!image.found()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .contentType(resolveContentType(imagePath))
                    .contentLength(image.contentLength())
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                    .body(image.resource());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String extractImagePath(HttpServletRequest request, String apiPrefix) {
        String requestUri = request.getRequestURI();
        int imagePathStart = requestUri.indexOf(apiPrefix);

        if (imagePathStart < 0) {
            throw new IllegalArgumentException("Image path not found in request URI");
        }

        String encodedImagePath = requestUri.substring(imagePathStart + apiPrefix.length());
        String imagePath = UriUtils.decode(encodedImagePath, StandardCharsets.UTF_8);

        if (imagePath.isBlank()) {
            throw new IllegalArgumentException("Image path must not be empty");
        }

        return imagePath;
    }

    private MediaType resolveContentType(String imagePath) {
        String lowerPath = imagePath.toLowerCase();

        if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }

        if (lowerPath.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (lowerPath.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }

        if (lowerPath.endsWith(".bmp")) {
            return MediaType.parseMediaType("image/bmp");
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
