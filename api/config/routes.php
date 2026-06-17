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
    ['method' => 'POST',   'path' => '/users/register',      'controller' => 'UserController', 'action' => 'register'],
    ['method' => 'PATCH',  'path' => '/users/me',            'controller' => 'UserController', 'action' => 'update'],
    ['method' => 'PATCH',  'path' => '/users/me/job-position',      'controller' => 'UserController', 'action' => 'assignJobPosition'],
    ['method' => 'PATCH',  'path' => '/users/me/password',   'controller' => 'UserController', 'action' => 'changePassword'],
    ['method' => 'GET',    'path' => '/users/me',            'controller' => 'UserController', 'action' => 'show'],
    ['method' => 'GET',    'path' => '/users',               'controller' => 'UserController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/users/{id}',          'controller' => 'UserController', 'action' => 'getById'],
    ['method' => 'PATCH',  'path' => '/users/{id}/role',     'controller' => 'UserController', 'action' => 'changeRole'],
    ['method' => 'DELETE', 'path' => '/users/{id}',          'controller' => 'UserController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/users/{id}/restore',  'controller' => 'UserController', 'action' => 'restore'],

    // Area routes
    ['method' => 'POST',   'path' => '/areas',      'controller' => 'AreaController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/areas',      'controller' => 'AreaController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'show'],
    ['method' => 'PATCH',    'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/areas/{id}', 'controller' => 'AreaController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/areas/{id}/restore', 'controller' => 'AreaController', 'action' => 'restore'],

    // Section routes (read-only, for selection)
    ['method' => 'POST',   'path' => '/sections',      'controller' => 'SectionController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/sections',      'controller' => 'SectionController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/sections/{id}', 'controller' => 'SectionController', 'action' => 'show'],
    ['method' => 'PATCH',  'path' => '/sections/{id}', 'controller' => 'SectionController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/sections/{id}', 'controller' => 'SectionController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/sections/{id}/restore', 'controller' => 'SectionController', 'action' => 'restore'],

    // Occupational class routes (read-only, for selection)
    ['method' => 'GET',    'path' => '/job-classes', 'controller' => 'JobClassController', 'action' => 'index'],

    // Plaza (job position) routes
    ['method' => 'GET',    'path' => '/jobs', 'controller' => 'JobPositionController', 'action' => 'types'],
    ['method' => 'POST',   'path' => '/job-positions',      'controller' => 'JobPositionController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/job-positions',      'controller' => 'JobPositionController', 'action' => 'index'],
    ['method' => 'PATCH',  'path' => '/job-positions/{id}', 'controller' => 'JobPositionController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/job-positions/{id}', 'controller' => 'JobPositionController', 'action' => 'delete'],

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

    // Rest time routes
    ['method' => 'POST',   'path' => '/rest-time',      'controller' => 'RestTimeController', 'action' => 'create'],
    ['method' => 'GET',    'path' => '/rest-time',      'controller' => 'RestTimeController', 'action' => 'index'],
    ['method' => 'GET',    'path' => '/rest-time/{id}', 'controller' => 'RestTimeController', 'action' => 'show'],
    ['method' => 'PATCH',  'path' => '/rest-time/{id}', 'controller' => 'RestTimeController', 'action' => 'update'],
    ['method' => 'DELETE', 'path' => '/rest-time/{id}', 'controller' => 'RestTimeController', 'action' => 'delete'],
    ['method' => 'POST',   'path' => '/rest-time/{id}/restore', 'controller' => 'RestTimeController', 'action' => 'restore'],
];