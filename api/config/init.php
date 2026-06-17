<?php
declare(strict_types=1);

// PHP CONFIG
// Errors are logged server-side and surfaced to clients as standardized JSON
// by GlobalErrorHandler; they must never be printed into the HTTP response.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
