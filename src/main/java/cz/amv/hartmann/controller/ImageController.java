package cz.amv.hartmann.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ImageController {

    private static final String BASE_PATH = "C:/Users/JaroslavMáčala/Documents/";

    @GetMapping("/**")
    public ResponseEntity<Resource> getImage(HttpServletRequest request) {
        try {
            // získání části za /api/images/
            String fullPath = request.getRequestURI();
            String relativePath = fullPath.replace("/api/images/", "");

            // DECODE
            relativePath = URLDecoder.decode(relativePath, StandardCharsets.UTF_8);

            Path baseDir = Paths.get(BASE_PATH).toAbsolutePath().normalize();
            Path resolvedPath = baseDir.resolve(relativePath).normalize();

            // ochrana proti path traversal
            if (!resolvedPath.startsWith(baseDir)) {
                return ResponseEntity.badRequest().build();
            }

            if (!Files.exists(resolvedPath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(resolvedPath.toUri());

            String contentType = Files.probeContentType(resolvedPath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
