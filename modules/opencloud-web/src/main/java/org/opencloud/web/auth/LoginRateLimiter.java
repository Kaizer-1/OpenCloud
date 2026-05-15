package org.opencloud.web.auth;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class LoginRateLimiter {

    // 5 failed attempts per email allowed before a 5-minute lockout
    private static final int MAX_FAILURES = 5;
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(5);

    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket bucketFor(String email) {
        return buckets.computeIfAbsent(email.toLowerCase(), k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(MAX_FAILURES)
                                .refillGreedy(MAX_FAILURES, REFILL_PERIOD)
                                .build())
                        .build());
    }

    /** Returns true if this failed attempt is allowed; false if the caller is locked out. */
    public boolean recordFailure(String email) {
        return bucketFor(email).tryConsume(1);
    }

    /** Remaining seconds until the bucket refills (approximate). 0 if not locked out. */
    public long secondsUntilRefill(String email) {
        var probe = bucketFor(email).estimateAbilityToConsume(1);
        if (probe.canBeConsumed()) return 0;
        return probe.getNanosToWaitForRefill() / 1_000_000_000L;
    }

    /** Reset on successful login so a user who eventually gets in isn't punished. */
    public void reset(String email) {
        buckets.remove(email.toLowerCase());
    }
}
