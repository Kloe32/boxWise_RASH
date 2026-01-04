CREATE TABLE IF NOT EXISTS users (   id INT AUTO_INCREMENT PRIMARY KEY,   full_name VARCHAR(50) NOT NULL,   email VARCHAR(50) UNIQUE NOT NULL,   phone VARCHAR(20),   role ENUM('ADMIN','CUSTOMER') DEFAULT 'CUSTOMER',   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP )ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS storage_units (   id INT AUTO_INCREMENT PRIMARY KEY,   room_number VARCHAR(10) NOT NULL,   email VARCHAR(50) UNIQUE NOT NULL,   base_price DECIMAL(10,2),   size_type ENUM('SMALL','MEDIUM','LARGE') DEFAULT 'MEDIUM',   status ENUM('AVAILABLE','LOCKED','OCCUPIED'),   is_active BOOLEAN DEFAULT TRUE,   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP )ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS bookings(
	id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
	
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_return_date DATE NOT NULL,
    
    final_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    status ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    
    CONSTRAINT fk_bookings_user
	FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
    
	CONSTRAINT fk_bookings_room
	FOREIGN KEY (room_id) REFERENCES storage_units(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)ENGINE = InnoDB;

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_status ON bookings(status);


CREATE TABLE IF NOT EXISTS Address (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,

  address_type ENUM('PickUp','Delivery') NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255) NULL,
  postal_code INT NOT NULL,

  CONSTRAINT fk_address_booking
    FOREIGN KEY (reservation_id) REFERENCES bookings(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
) ENGINE=InnoDB;

CREATE INDEX idx_address_reservation_id ON Address(reservation_id);

CREATE TABLE IF NOT EXISTS seasonal_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicable_month TINYINT NOT NULL,     -- 1..12
  year_reference INT NOT NULL,           -- e.g., 2025
  multiplier DECIMAL(3,2) NOT NULL,
  demand_label VARCHAR(50),

  CONSTRAINT chk_month CHECK (applicable_month BETWEEN 1 AND 12),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_month_year (applicable_month, year_reference)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  method_name VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  method_id INT NOT NULL,

  amount DECIMAL(10,2) NOT NULL,
  type ENUM('Deposit','Rental','EarlyReturn') NOT NULL,
  date DATE NOT NULL,
  payment_status ENUM('Pending','Paid','Failed') NOT NULL DEFAULT 'Pending',

  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_payments_method
    FOREIGN KEY (method_id) REFERENCES payment_methods(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_method_id ON payments(method_id);



