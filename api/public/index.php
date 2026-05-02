<?php
declare(strict_types=1);

use Http\Response;
use Http\Request;
use Http\ErrorType;
use Core\ErrorHandler;
use Core\GlobalErrorHandler;
use Router\SimpleRouter;

// CORS Rules
require __DIR__ . '/../config/cors.php';

// Initial configurations
require __DIR__ . '/../config/init.php';

// Autoloader
spl_autoload_register(function (string $class): void {
  $baseDir = __DIR__ . '/../src/';
  $file = $baseDir . str_replace('\\', '/', $class) . '.php';
  if (file_exists($file)) {
    require_once $file;
  }
});

// Error handling
GlobalErrorHandler::register();

// Database connection
$db = require __DIR__ . '/../config/database.php';

// Session validation
require __DIR__ . '/../config/session.php';
validateSessionToken($db);

// Request parsing
$path = Request::getPath();
$method = Request::getMethod();

// Load routes
$routes = require __DIR__ . '/../config/routes.php';

// Route dispatching
$router = new SimpleRouter($routes, $db);
$response = $router->dispatch($method, $path);

// If no route matched, return 404
if ($response === null) {
  Response::error(ErrorType::notFound('Route'), 404);
}