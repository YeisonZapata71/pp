-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 21-04-2026 a las 01:56:23
-- Versión del servidor: 11.8.6-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u738685852_pp`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `directory_jacs`
--

CREATE TABLE `directory_jacs` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `zone` varchar(50) NOT NULL,
  `president` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `global_budgets`
--

CREATE TABLE `global_budgets` (
  `year` int(11) NOT NULL,
  `initial_budget` decimal(20,2) NOT NULL DEFAULT 0.00,
  `addition` decimal(20,2) NOT NULL DEFAULT 0.00,
  `superavit` decimal(20,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `jacs`
--

CREATE TABLE `jacs` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `year` int(11) NOT NULL,
  `assigned` decimal(20,2) NOT NULL DEFAULT 0.00,
  `addition` decimal(20,2) NOT NULL DEFAULT 0.00,
  `paid` decimal(20,2) NOT NULL DEFAULT 0.00,
  `projects` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `jac_id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `amount` decimal(20,2) NOT NULL,
  `date` date NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `jac_id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `budget` decimal(20,2) NOT NULL DEFAULT 0.00,
  `has_addition` tinyint(1) NOT NULL DEFAULT 0,
  `addition` decimal(20,2) NOT NULL DEFAULT 0.00,
  `documents_json` text DEFAULT NULL,
  `photos_json` text DEFAULT NULL,
  `notes_json` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`) VALUES
(1, 'admin', '123', 'Alcalde General', 'admin'),
(2, 'gestor', '123', 'Gestor Operativo', 'gestor');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `directory_jacs`
--
ALTER TABLE `directory_jacs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `global_budgets`
--
ALTER TABLE `global_budgets`
  ADD PRIMARY KEY (`year`);

--
-- Indices de la tabla `jacs`
--
ALTER TABLE `jacs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `directory_jacs`
--
ALTER TABLE `directory_jacs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `jacs`
--
ALTER TABLE `jacs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
