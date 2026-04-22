package cz.amv.hartmann.controller;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ImageController {

    private static final String IMAGES_BASE_PATH = "src/main/resources/static/images/";

    @GetMapping("/{imageName}")
    public ResponseEntity<Resource> getImage(@PathVariable String imageName) {
        try {
            // Sestavení cesty k obrázku
            Path imagePath = Paths.get(IMAGES_BASE_PATH + imageName);
            File imageFile = imagePath.toFile();

            if (!imageFile.exists()) {
                return ResponseEntity.notFound().build();
            }

            // Určení MIME typu
            String contentType = Files.probeContentType(imagePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            Resource resource = new FileSystemResource(imageFile);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + imageName + "\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/check/{imageName}")
    public ResponseEntity<?> checkImage(@PathVariable String imageName) {
        try {
            Path imagePath = Paths.get(IMAGES_BASE_PATH + imageName);
            File imageFile = imagePath.toFile();

            return ResponseEntity.ok().body(Map.of(
                    "exists", imageFile.exists(),
                    "path", imagePath.toString(),
                    "size", imageFile.length()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok().body(Map.of(
                    "exists", false,
                    "error", e.getMessage()
            ));
        }
    }
}