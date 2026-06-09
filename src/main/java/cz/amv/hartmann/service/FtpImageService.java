package cz.amv.hartmann.service;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPReply;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@Service
public class FtpImageService {

    private final String host;
    private final int port;
    private final String username;
    private final String password;
    private final String basePath;
    private final boolean passiveMode;
    private final int connectTimeoutMillis;
    private final int dataTimeoutMillis;

    public FtpImageService(
            @Value("${hartmann.images.ftp.base-url:${FTP_BASE_URL:}}") String baseUrl,
            @Value("${hartmann.images.ftp.host:${FTP_HOST:}}") String host,
            @Value("${hartmann.images.ftp.port:${FTP_PORT:21}}") int port,
            @Value("${hartmann.images.ftp.username:${FTP_USERNAME:}}") String username,
            @Value("${hartmann.images.ftp.password:${FTP_PASSWORD:}}") String password,
            @Value("${hartmann.images.ftp.base-path:${FTP_BASE_PATH:/}}") String basePath,
            @Value("${hartmann.images.ftp.passive-mode:${FTP_PASSIVE_MODE:true}}") boolean passiveMode,
            @Value("${hartmann.images.ftp.connect-timeout-millis:${FTP_CONNECT_TIMEOUT_MILLIS:5000}}") int connectTimeoutMillis,
            @Value("${hartmann.images.ftp.data-timeout-millis:${FTP_DATA_TIMEOUT_MILLIS:10000}}") int dataTimeoutMillis
    ) {
        FtpConnectionConfig config = FtpConnectionConfig.from(baseUrl, host, port, username, password, basePath);

        this.host = config.host();
        this.port = config.port();
        this.username = config.username();
        this.password = config.password();
        this.basePath = normalizeFtpPath(config.basePath());
        this.passiveMode = passiveMode;
        this.connectTimeoutMillis = connectTimeoutMillis;
        this.dataTimeoutMillis = dataTimeoutMillis;
    }

    public FtpImage loadImage(String imagePath) throws IOException {
        String ftpPath = resolveImagePath(imagePath);
        FTPClient ftpClient = connect();

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            boolean retrieved = ftpClient.retrieveFile(ftpPath, outputStream);

            if (!retrieved) {
                return FtpImage.notFound();
            }

            return new FtpImage(new ByteArrayResource(outputStream.toByteArray()), outputStream.size(), true);
        } finally {
            disconnect(ftpClient);
        }
    }

    public boolean exists(String imagePath) throws IOException {
        String ftpPath = resolveImagePath(imagePath);
        FTPClient ftpClient = connect();

        try {
            if (ftpClient.mlistFile(ftpPath) != null) {
                return true;
            }

            return ftpClient.listFiles(ftpPath).length > 0;
        } finally {
            disconnect(ftpClient);
        }
    }

    private FTPClient connect() throws IOException {
        FTPClient ftpClient = new FTPClient();
        ftpClient.setControlEncoding("UTF-8");
        ftpClient.setConnectTimeout(connectTimeoutMillis);
        ftpClient.setDataTimeout(Duration.ofMillis(dataTimeoutMillis));
        ftpClient.connect(host, port);

        if (!FTPReply.isPositiveCompletion(ftpClient.getReplyCode())) {
            disconnect(ftpClient);
            throw new IOException("FTP server rejected connection: " + ftpClient.getReplyString());
        }

        if (!ftpClient.login(username, password)) {
            disconnect(ftpClient);
            throw new IOException("FTP login failed for user: " + username);
        }

        ftpClient.setFileType(FTP.BINARY_FILE_TYPE);

        if (passiveMode) {
            ftpClient.enterLocalPassiveMode();
        }

        return ftpClient;
    }

    private void disconnect(FTPClient ftpClient) throws IOException {
        if (ftpClient == null) {
            return;
        }

        if (ftpClient.isConnected()) {
            ftpClient.logout();
            ftpClient.disconnect();
        }
    }

    private String resolveImagePath(String imagePath) {
        if (!StringUtils.hasText(imagePath)) {
            throw new IllegalArgumentException("Image path must not be empty");
        }

        String normalizedImagePath = normalizeFtpPath(imagePath);
        String resolvedPath = normalizedImagePath.startsWith("/")
                ? normalizedImagePath
                : normalizeFtpPath(basePath + "/" + normalizedImagePath);

        if (!isUnderBasePath(resolvedPath)) {
            throw new IllegalArgumentException("Image path is outside configured FTP base path");
        }

        return resolvedPath;
    }

    private boolean isUnderBasePath(String ftpPath) {
        return basePath.equals("/") || ftpPath.equals(basePath) || ftpPath.startsWith(basePath + "/");
    }

    private String normalizeFtpPath(String value) {
        String prepared = value.replace('\\', '/').trim();
        boolean absolute = prepared.startsWith("/");

        try {
            Path normalized = Paths.get(prepared).normalize();
            String ftpPath = normalized.toString().replace('\\', '/');

            if (ftpPath.equals(".") || ftpPath.isBlank()) {
                ftpPath = "";
            }

            ftpPath = absolute ? "/" + removeLeadingSlash(ftpPath) : removeLeadingSlash(ftpPath);
            ftpPath = removeTrailingSlash(ftpPath);

            if (ftpPath.contains("..")) {
                throw new IllegalArgumentException("FTP path must not contain path traversal segments");
            }

            return ftpPath.isBlank() ? "/" : ftpPath;
        } catch (InvalidPathException e) {
            throw new IllegalArgumentException("Invalid FTP image path", e);
        }
    }

    private String removeLeadingSlash(String value) {
        String result = value;
        while (result.startsWith("/")) {
            result = result.substring(1);
        }
        return result;
    }

    private String removeTrailingSlash(String value) {
        String result = value;
        while (result.length() > 1 && result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private record FtpConnectionConfig(
            String host,
            int port,
            String username,
            String password,
            String basePath
    ) {
        private static final int DEFAULT_FTP_PORT = 21;

        private static FtpConnectionConfig from(
                String baseUrl,
                String host,
                int port,
                String username,
                String password,
                String basePath
        ) {
            if (!StringUtils.hasText(baseUrl)) {
                validateRequired(host, "FTP host");
                validateRequired(username, "FTP username");
                return new FtpConnectionConfig(host, port, username, password, basePath);
            }

            URI uri = URI.create(baseUrl);

            if (!"ftp".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalArgumentException("FTP base URL must use ftp:// scheme");
            }

            validateRequired(uri.getHost(), "FTP host in base URL");

            UserCredentials credentials = UserCredentials.from(uri.getUserInfo(), username, password);
            String configuredBasePath = StringUtils.hasText(uri.getPath()) ? uri.getPath() : basePath;
            int configuredPort = uri.getPort() > 0 ? uri.getPort() : DEFAULT_FTP_PORT;

            return new FtpConnectionConfig(
                    uri.getHost(),
                    configuredPort,
                    credentials.username(),
                    credentials.password(),
                    configuredBasePath
            );
        }

        private static void validateRequired(String value, String label) {
            if (!StringUtils.hasText(value)) {
                throw new IllegalArgumentException(label + " must be configured");
            }
        }
    }

    private record UserCredentials(String username, String password) {
        private static UserCredentials from(String userInfo, String fallbackUsername, String fallbackPassword) {
            if (!StringUtils.hasText(userInfo)) {
                FtpConnectionConfig.validateRequired(fallbackUsername, "FTP username");
                return new UserCredentials(fallbackUsername, fallbackPassword);
            }

            String[] parts = userInfo.split(":", 2);
            String configuredUsername = parts[0];
            String configuredPassword = parts.length > 1 ? parts[1] : fallbackPassword;

            FtpConnectionConfig.validateRequired(configuredUsername, "FTP username");
            return new UserCredentials(configuredUsername, configuredPassword);
        }
    }

    public record FtpImage(ByteArrayResource resource, long contentLength, boolean found) {
        public static FtpImage notFound() {
            return new FtpImage(null, 0, false);
        }
    }
}
