<?php
declare(strict_types=1);

namespace Router;

use Http\Response;
use Http\ErrorType;
use PDO;
use Exception;

/**
 * Class SimpleRouter
 * 
 * A lightweight request dispatcher that maps incoming HTTP methods and URIs 
 * to specific Controller actions using Regex pattern matching.
 * 
 * It supports dynamic route parameters (e.g., /users/{id}) and implements 
 * a simple Dependency Injection pattern by injecting a PDO instance into 
 * instantiated controllers.
 * 
 * @package Router
 */
class SimpleRouter
{
    /** @var array<mixed> The application route definition map. */
    private array $routes;

    /** @var array<string, object> Singleton-like cache for instantiated controllers. */
    private array $controllers = [];

    /** @var PDO The database connection instance to be injected into controllers. */
    private PDO $db;


    /**
     * SimpleRouter constructor.
     * 
     * @param array<mixed> $routes Array of route definitions (method, path, controller, action).
     * @param PDO $db The database connection instance.
     */
    public function __construct(array $routes, \PDO $db)
    {
        $this->routes = $routes;
        $this->db = $db;
    }

    /**
     * Dispatches the request to the matching controller action.
     * 
     * Iterates through defined routes, converts path placeholders to regular expressions,
     * and executes the corresponding controller method if a match is found.
     * 
     * @param string $method The HTTP request method (e.g., 'GET', 'POST').
     * @param string $path The cleaned request URI path.
     * @return object|null Returns the result of the controller action or null if no match is found.
     */
    public function dispatch(string $method, string $path): ?object
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $pattern = $this->pathToRegex($route['path']);
            if (preg_match($pattern, $path, $matches)) {
                // Extract named captures from the regex match
                // (the dynamic URL parameters).
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                try {
                    $controller = $this->getController($route['controller']);
                } catch (\Exception $e) {
                    $error = ErrorType::notFound('Controller');
                    Response::error($error, $error->getStatusCode());
                    return null;
                }
                $action = $route['action'];

                // Execute the action with unpacked parameters or as a direct call
                if (!empty($params)) {
                    return $controller->$action(...array_values($params));
                }
                return $controller->$action();
            }
        }
        return null;
    }

    /**
     * Converts a simplified path string into a valid Regular Expression.
     * 
     * Transforms placeholders like {id} into named capture groups (?P<id>[^/]+).
     * 
     * @param string $path The raw route path (e.g., '/user/{id}').
     * @return string The compiled Regex pattern.
     */
    private function pathToRegex(string $path): string
    {
        $pattern = preg_replace('/\{([^}]+)\}/', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    /**
     * Retrieves a controller instance, ensuring it is only instantiated once (Flyweight pattern).
     * 
     * @param string $name The short name of the controller class.
     * @return object The instantiated controller.
     */
    private function getController(string $name)
    {
        if (!isset($this->controllers[$name])) {
            $this->controllers[$name] = $this->createController($name);
        }
        return $this->controllers[$name];
    }

    /**
     * Factory method to instantiate a controller with its dependencies.
     * 
     * @param string $name The short name of the controller.
     * @return object A new instance of the controller.
     */
    private function createController(string $name)
    {
        $controllerClass = "Controllers\\{$name}";
        return new $controllerClass($this->db);
    }
}