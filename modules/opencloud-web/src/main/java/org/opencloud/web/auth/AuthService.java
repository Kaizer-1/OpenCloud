package org.opencloud.web.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;
    private final LoginRateLimiter rateLimiter;

    public AuthService(UserRepository users, PasswordEncoder encoder,
                       JwtUtil jwt, LoginRateLimiter rateLimiter) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.rateLimiter = rateLimiter;
    }

    public record RegisterResult(Long userId, String email) {}
    public record LoginResult(String token, Long userId, String email) {}

    public RegisterResult register(String email, String password) {
        String normalised = email.toLowerCase().strip();
        if (users.existsByEmail(normalised)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setEmail(normalised);
        user.setPasswordHash(encoder.encode(password));
        users.save(user);
        return new RegisterResult(user.getId(), user.getEmail());
    }

    public LoginResult login(String email, String password) {
        String normalised = email.toLowerCase().strip();

        // Check rate limit before even touching the DB
        long waitSeconds = rateLimiter.secondsUntilRefill(normalised);
        if (waitSeconds > 0) {
            throw new RateLimitException(waitSeconds);
        }

        User user = users.findByEmail(normalised)
                .orElse(null);

        if (user == null || !encoder.matches(password, user.getPasswordHash())) {
            rateLimiter.recordFailure(normalised);
            // Re-check: if now locked out, include Retry-After
            long after = rateLimiter.secondsUntilRefill(normalised);
            if (after > 0) throw new RateLimitException(after);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        rateLimiter.reset(normalised);
        String token = jwt.generate(user.getId(), user.getEmail());
        return new LoginResult(token, user.getId(), user.getEmail());
    }
}
