package org.opencloud.web.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public DataSeeder(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!users.existsByEmail("demo@opencloud.local")) {
            User demo = new User();
            demo.setEmail("demo@opencloud.local");
            demo.setPasswordHash(encoder.encode("demo1234"));
            users.save(demo);
            log.info("Seeded demo user: demo@opencloud.local / demo1234");
        }
    }
}
