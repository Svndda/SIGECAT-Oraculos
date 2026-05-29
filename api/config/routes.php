<?php
return [
    // Auth routes
    ['method' => 'POST', 'path' => '/auth/refresh', 'controller' => 'AuthController', 'action' => 'refresh'],
    ['method' => 'POST', 'path' => '/auth/login', 'controller' => 'AuthController', 'action' => 'login'],
    ['method' => 'POST', 'path' => '/auth/logout', 'controller' => 'AuthController', 'action' => 'logout'],
    
    // User routes
    ['method' => 'PATCH', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'update'],
    ['method' => 'GET', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'show'],
    ['method' => 'GET', 'path' => '/users/{id}', 'controller' => 'UserController', 'action' => 'getById'],
    ['method' => 'GET', 'path' => '/users/me/session', 'controller' => 'UserController', 'action' => 'showSession'],
    ['method' => 'POST', 'path' => '/users/register', 'controller' => 'UserController', 'action' => 'register'],

    // ['method' => 'DELETE', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'delete']

    // Area routes
    ['method' => 'POST',   'path' => '/areas',      'controller' => 'AreaController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/areas',      'controller' => 'AreaController', 'action' => 'index'],
    ['method' => 'PUT',    'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'delete'],
];