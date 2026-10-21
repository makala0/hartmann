# Integration tests

Run the full build (including the frontend and all Java tests):

```powershell
.\mvnw clean package
```

The build requires JDK 17 or newer and access to the dependency repositories.
Maven installs the frontend tools declared in `pom.xml`.

All Spring integration tests explicitly load
`src/test/resources/application-test.properties` using `@TestPropertySource`.
This takes precedence over application configuration and environment variables:
tests use an isolated in-memory H2 database, recreate its schema per Spring
context, and disable the mail sender. SQL Server, SMTP, FTP and application
credentials are not required. Tests that insert fixtures roll back their
transactions after each test. Do not remove this test configuration or point
tests at an application database.

These are H2 integration tests; they do not establish compatibility with every
SQL Server-specific behavior. Test resources are not included in the application
JAR and do not change the database configuration used when running the app.
