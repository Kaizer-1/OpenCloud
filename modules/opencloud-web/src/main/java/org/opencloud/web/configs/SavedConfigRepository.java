package org.opencloud.web.configs;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedConfigRepository extends JpaRepository<SavedConfig, Long> {
    List<SavedConfig> findByUserIdOrderByCreatedAtDesc(Long userId);
}
