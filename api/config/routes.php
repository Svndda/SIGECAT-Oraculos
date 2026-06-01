<?php
return [
    // Auth routes
    ['method' => 'POST', 'path' => '/auth/refresh', 'controller' => 'AuthController', 'action' => 'refresh'],
    ['method' => 'POST', 'path' => '/auth/login',   'controller' => 'AuthController', 'action' => 'login'],
    ['method' => 'POST', 'path' => '/auth/logout',  'controller' => 'AuthController', 'action' => 'logout'],

    // Password recovery routes (public — no auth token required)
    ['method' => 'POST', 'path' => '/auth/password-recovery/request', 'controller' => 'PasswordRecoveryController', 'action' => 'request'],
    ['method' => 'POST', 'path' => '/auth/password-recovery/reset',   'controller' => 'PasswordRecoveryController', 'action' => 'reset'],
    
    // User routes
    ['method' => 'POST', 'path' => '/users/register', 'controller' => 'UserController', 'action' => 'register'],
    ['method' => 'PATCH', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'update'],
    ['method' => 'GET', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'show'],
    ['method' => 'GET', 'path' => '/users/{id}', 'controller' => 'UserController', 'action' => 'getById'],
    // ['method' => 'DELETE', 'path' => '/users/me', 'controller' => 'UserController', 'action' => 'delete']

    // Area routes
    ['method' => 'POST',   'path' => '/areas',      'controller' => 'AreaController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/areas',      'controller' => 'AreaController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'show'],
    ['method' => 'PATCH',    'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/areas/{id}/restore', 'controller' => 'AreaController', 'action' => 'restore'],

    // Department routes
    ['method' => 'POST',   'path' => '/departments',      'controller' => 'DepartmentController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/departments',      'controller' => 'DepartmentController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/departments/{id}', 'controller' => 'DepartmentController', 'action' => 'show'],
    ['method' => 'PATCH',    'path' => '/departments/{id}', 'controller' => 'DepartmentController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/departments/{id}', 'controller' => 'DepartmentController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/departments/{id}/restore', 'controller' => 'DepartmentController', 'action' => 'restore'],

    // Unit routes
    ['method' => 'POST',   'path' => '/units',      'controller' => 'UnitController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/units',      'controller' => 'UnitController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/units/{id}', 'controller' => 'UnitController', 'action' => 'show'],
    ['method' => 'PATCH',  'path' => '/units/{id}', 'controller' => 'UnitController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/units/{id}', 'controller' => 'UnitController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/units/{id}/restore', 'controller' => 'UnitController', 'action' => 'restore'],
];