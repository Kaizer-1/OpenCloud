package org.cloudbus.cloudsim.web.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.jwt.secret=test-secret-that-is-long-enough-32chars"
})
class AuthServiceTest {

    @Autowired AuthService authService;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    void register_createsUser() {
        var result = authService.register("alice@example.com", "password123");
        assertThat(result.email()).isEqualTo("alice@example.com");
        assertThat(result.userId()).isNotNull();
        assertThat(userRepository.existsByEmail("alice@example.com")).isTrue();
    }

    @Test
    void register_rejectsduplicateEmail() {
        authService.register("bob@example.com", "password123");
        assertThatThrownBy(() -> authService.register("BOB@EXAMPLE.COM", "other"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already");
    }

    @Test
    void login_succeeds_withCorrectCredentials() {
        authService.register("carol@example.com", "secret99");
        var result = authService.login("carol@example.com", "secret99");
        assertThat(result.email()).isEqualTo("carol@example.com");
        assertThat(result.token()).isNotBlank();
    }

    @Test
    void login_failsWithWrongPassword() {
        authService.register("dave@example.com", "rightpass");
        assertThatThrownBy(() -> authService.login("dave@example.com", "wrongpass"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void login_failsForUnknownEmail() {
        assertThatThrownBy(() -> authService.login("ghost@example.com", "any"))
                .isInstanceOf(ResponseStatusException.class);
    }
}
