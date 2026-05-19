<?php
return [
    // Auth routes
    ['method' => 'POST', 'path' => '/auth/refresh', 'controller' => 'AuthController', 'action' => 'refresh'],
    ['method' => 'POST', 'path' => '/auth/login', 'controller' => 'AuthController', 'action' => 'login'],
    ['method' => 'POST', 'path' => '/auth/logout', 'controller' => 'AuthController', 'action' => 'logout'],
    
    // User routes
    ['method' => 'GET', 'path' => '/users/{id}', 'controller' => 'UserController', 'action' => 'getById'],
    ['method' => 'PUT', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'update'],
    // ['method' => 'GET', 'path' => '/users/me/session', 'controller' => 'UserController', 'action' => 'showSession'],
    ['method' => 'POST', 'path' => '/users/register', 'controller' => 'UserController', 'action' => 'register'],

    // ['method' => 'DELETE', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'delete']
];