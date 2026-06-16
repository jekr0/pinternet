-- =====================================================================
-- GRINDEREST — финальная схема (с учётом правок)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------

CREATE TABLE Users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      NVARCHAR(16) NOT NULL UNIQUE,
    email         NVARCHAR(256) NOT NULL UNIQUE,
    password_hash NVARCHAR(512) NOT NULL,
    avatar        NVARCHAR(256),
    bio           NVARCHAR(256),
    total_likes   INT NOT NULL DEFAULT 0,
    exp           INT NOT NULL DEFAULT 0,
    level         INT NOT NULL DEFAULT 1,
    role          ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user',
    is_banned     TINYINT(1) NOT NULL DEFAULT 0,
    is_deleted    TINYINT(1) NOT NULL DEFAULT 0,
    timeout_until DATETIME DEFAULT NULL,
    username_changed_at DATETIME DEFAULT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE User_Follows (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    follower_id          INT NOT NULL,
    following_id         INT NOT NULL,
    notifications_switch TINYINT(1) NOT NULL DEFAULT 0,

    UNIQUE KEY uq_follow (follower_id, following_id),
    CHECK (follower_id != following_id),

    FOREIGN KEY (follower_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE User_Follows_Exp_Awards (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    subscriber_id     INT NOT NULL,
    subscribed_user_id INT NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_subscribe_exp_award (subscriber_id, subscribed_user_id),

    FOREIGN KEY (subscriber_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscribed_user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE User_Search (
    user_id     INT NOT NULL,
    slot_index  TINYINT NOT NULL,
    query_text  NVARCHAR(128) NOT NULL,
    searched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, slot_index),
    KEY idx_user_search_recent (user_id, searched_at),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE User_Blocks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    blocker_user_id INT NOT NULL,
    blocked_user_id INT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_block (blocker_user_id, blocked_user_id),
    CHECK (blocker_user_id != blocked_user_id),

    FOREIGN KEY (blocker_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE User_Reports (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    reported_user_id INT NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_report (user_id, reported_user_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Hashtags
-- ---------------------------------------------------------------------

CREATE TABLE Hashtags (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name NVARCHAR(64) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------

CREATE TABLE Posts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    image_path   NVARCHAR(256) NOT NULL,
    description  NVARCHAR(512),
    report_count INT NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    was_redacted TINYINT(1) NOT NULL DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE NO ACTION
);

CREATE TABLE Post_Hashtags (
    post_id    INT NOT NULL,
    hashtag_id INT NOT NULL,
    PRIMARY KEY (post_id, hashtag_id),

    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES Hashtags(id) ON DELETE CASCADE
);

CREATE TABLE Post_Likes (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,

    UNIQUE KEY uq_like (user_id, post_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE
);

CREATE TABLE Post_Like_Exp_Awards (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    liker_user_id INT NOT NULL,
    post_id       INT NOT NULL,
    post_owner_id INT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_like_exp_award (liker_user_id, post_id),

    FOREIGN KEY (liker_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
    FOREIGN KEY (post_owner_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Post_Reports (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NULL,
    post_id    INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_post_report (user_id, post_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE
);

-- Триггер для report_count
DELIMITER $$

CREATE TRIGGER trg_post_reports_insert
AFTER INSERT ON Post_Reports
FOR EACH ROW
BEGIN
    UPDATE Posts
    SET report_count = report_count + 1
    WHERE id = NEW.post_id;
END$$

CREATE TRIGGER trg_post_reports_delete
AFTER DELETE ON Post_Reports
FOR EACH ROW
BEGIN
    UPDATE Posts
    SET report_count = report_count - 1
    WHERE id = OLD.post_id;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------

CREATE TABLE Collections (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    name        NVARCHAR(64) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE NO ACTION
);

CREATE TABLE Collection_Hashtags (
    collection_id   INT NOT NULL,
    hashtag_id      INT NOT NULL,
    PRIMARY KEY (collection_id, hashtag_id),

    FOREIGN KEY (collection_id) REFERENCES Collections(id) ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES Hashtags(id) ON DELETE CASCADE
);

CREATE TABLE Collection_Posts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    post_id       INT NOT NULL,
    collection_id INT NULL,

    UNIQUE KEY uq_saved (user_id, post_id, collection_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES Collections(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------

CREATE TABLE Comments (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT NOT NULL,
    post_id           INT NOT NULL,
    parent_comment_id INT DEFAULT NULL,
    content           NVARCHAR(256) NOT NULL,
    is_deleted        TINYINT(1) NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE NO ACTION,
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES Comments(id)
);

CREATE TABLE Comment_Likes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NULL,
    comment_id INT NOT NULL,

    UNIQUE KEY uq_comment_like (user_id, comment_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (comment_id) REFERENCES Comments(id) ON DELETE CASCADE
);

CREATE TABLE Comment_Like_Exp_Awards (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    liker_user_id    INT NOT NULL,
    comment_id       INT NOT NULL,
    comment_owner_id INT NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_comment_like_exp_award (liker_user_id, comment_id),

    FOREIGN KEY (liker_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES Comments(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_owner_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Comment_Reports (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NULL,
    comment_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_comment_report (user_id, comment_id),

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (comment_id) REFERENCES Comments(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------

CREATE TABLE Messages (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id   INT NOT NULL,
    text         TEXT NOT NULL,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX (from_user_id, to_user_id),
    INDEX (to_user_id, is_read),

    FOREIGN KEY (from_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Global_Search (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    query_text  NVARCHAR(128) NOT NULL,
    searched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_global_search_recent (searched_at),
    KEY idx_global_search_query (query_text)
);

CREATE TABLE Notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    title      NVARCHAR(64) NOT NULL,
    text       NVARCHAR(256) NULL,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------

CREATE TABLE Moderation (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    moderator_id   INT NULL,
    user_id        INT NULL,
    post_id        INT NULL,
    comment_id     INT NULL,
    reason         NVARCHAR(256),
    report_issued  TINYINT(1) NOT NULL DEFAULT 0,
    timeout_issued TINYINT(1) NOT NULL DEFAULT 0,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (moderator_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE SET NULL,
    FOREIGN KEY (comment_id) REFERENCES Comments(id) ON DELETE SET NULL
);