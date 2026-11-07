-- Paso 13: ejecutar una sola vez en MySQL Workbench.
-- Las doce tablas anteriores deben existir en nails_express.
USE nails_express;

CREATE TABLE Citas (
    -- Folio público que generará el backend, por ejemplo NE-4821.
    Folio_cita VARCHAR(12) NOT NULL,

    -- Datos de contacto conservados al reservar; cuenta opcional.
    Cliente_id_cita INT NULL,
    Nombre_cliente_cita VARCHAR(100) NOT NULL,
    Telefono_cliente_cita CHAR(10) NOT NULL,

    Servicio_id_cita INT NOT NULL,
    Diseno_id_cita INT NOT NULL,
    Color_id_cita INT NULL,
    Sucursal_id_cita INT NOT NULL,

    -- NULL representa una cita sin empleada asignada.
    Empleada_id_cita INT NULL,
    Fecha_cita DATE NOT NULL,
    Horario_id_cita INT NOT NULL,

    -- Conservan el precio y la duración acordados para esta cita.
    Total_cita DECIMAL(8,2) NOT NULL,
    Duracion_cita SMALLINT NOT NULL,
    Pago_cita VARCHAR(20) NOT NULL,
    Estado_cita VARCHAR(20) NOT NULL DEFAULT 'activa',
    Fecha_creacion_cita DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Datos operativos que la página ya utiliza.
    Reprogramaciones_cita SMALLINT NOT NULL DEFAULT 0,
    Cancelada_por_cita VARCHAR(20) NULL,
    Asignada_al_atender_cita BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (Folio_cita),

    CONSTRAINT fk_cita_cliente FOREIGN KEY (Cliente_id_cita)
        REFERENCES Usuarios (Id_usuario),
    CONSTRAINT fk_cita_servicio FOREIGN KEY (Servicio_id_cita)
        REFERENCES Servicios (Id_servicio),
    CONSTRAINT fk_cita_diseno FOREIGN KEY (Diseno_id_cita)
        REFERENCES Disenos (Id_diseno),
    CONSTRAINT fk_cita_color FOREIGN KEY (Color_id_cita)
        REFERENCES Colores (Id_color),
    CONSTRAINT fk_cita_sucursal FOREIGN KEY (Sucursal_id_cita)
        REFERENCES Sucursales (Id_sucursal),
    CONSTRAINT fk_cita_empleada FOREIGN KEY (Empleada_id_cita)
        REFERENCES Empleadas (Id_empleada),
    CONSTRAINT fk_cita_horario FOREIGN KEY (Horario_id_cita)
        REFERENCES Horarios (Id_horario),

    CONSTRAINT chk_cita_telefono
        CHECK (Telefono_cliente_cita REGEXP '^[0-9]{10}$'),
    CONSTRAINT chk_cita_total CHECK (Total_cita >= 0),
    CONSTRAINT chk_cita_duracion CHECK (Duracion_cita > 0),
    CONSTRAINT chk_cita_pago CHECK (Pago_cita IN ('anticipo', 'sucursal')),
    CONSTRAINT chk_cita_estado
        CHECK (Estado_cita IN ('activa', 'atendida', 'no-asistio', 'cancelada')),
    CONSTRAINT chk_cita_reprogramaciones CHECK (Reprogramaciones_cita >= 0),
    CONSTRAINT chk_cita_cancelacion
        CHECK (Cancelada_por_cita IS NULL
            OR (Estado_cita = 'cancelada'
                AND Cancelada_por_cita IN ('cliente', 'salon'))),
    CONSTRAINT chk_cita_asignada CHECK (Asignada_al_atender_cita IN (0, 1))
);

-- Esperado: 19 campos y ninguna cita registrada todavía.
DESCRIBE Citas;
SELECT * FROM Citas;

-- Comprobación del cierre de la estructura: esperado, 13 tablas.
SHOW TABLES;
SELECT COUNT(*) AS Total_tablas
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';
