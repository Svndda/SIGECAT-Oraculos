<?php
declare(strict_types=1);

/**
 * Common bootstrap for test scripts.
 * - Loads composer autoload
 * - Sets TNS_ADMIN if not present (so DB tests work from CLI)
 * - Provides minimal assertion / HTTP helpers
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/oci_config.php';

// Register the project's catch-all autoloader (mirrors api/public/index.php)
// so namespaces like DTO\, Repositories\, Services\, Http\ resolve under src/.
spl_autoload_register(function (string $class): void {
    $base = realpath(__DIR__ . '/../src');
    if ($base === false) {
        return;
    }
    $file = $base . DIRECTORY_SEPARATOR . str_replace('\\', DIRECTORY_SEPARATOR, $class) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

if (getenv('TNS_ADMIN') === false) {
    $wallet = realpath(__DIR__ . '/../../instantclient-basic-linux.x64-21.12.0.0.0dbru.el9/instantclient_21_12/network/admin');
    if ($wallet !== false) {
        putenv('TNS_ADMIN=' . $wallet);
    }
}

const API_BASE_URL = 'http://localhost:8000';

function tc_pass(string $tc, string $message): void
{
    echo "  \033[32m[PASS]\033[0m $tc — $message\n";
}

function tc_fail(string $tc, string $message): void
{
    echo "  \033[31m[FAIL]\033[0m $tc — $message\n";
    exit(1);
}

function tc_assert(bool $condition, string $tc, string $message): void
{
    $condition ? tc_pass($tc, $message) : tc_fail($tc, $message);
}

/**
 * Performs an HTTP request and returns ['status' => int, 'body' => array|null, 'raw' => string].
 *
 * @param array<string, mixed>|null $body
 * @param array<string, string> $headers
 * @return array{status: int, body: array<mixed>|null, raw: string}
 */
function tc_http(string $method, string $path, ?array $body = null, array $headers = [], ?string $rawBody = null): array
{
    $ch = curl_init(API_BASE_URL . $path);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $defaultHeaders = ['Content-Type: application/json', 'Accept: application/json'];
    foreach ($headers as $k => $v) {
        $defaultHeaders[] = "$k: $v";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);

    if ($rawBody !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
    } elseif ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        return ['status' => 0, 'body' => null, 'raw' => ''];
    }

    // The API may prefix some responses with an "Attempting login..." line — strip
    // anything before the first '{' to recover valid JSON.
    $jsonStart = strpos($raw, '{');
    $jsonText = $jsonStart === false ? $raw : substr($raw, $jsonStart);
    $decoded = json_decode($jsonText, true);

    return ['status' => (int) $status, 'body' => is_array($decoded) ? $decoded : null, 'raw' => $raw];
}

function tc_require_server(): void
{
    $ch = curl_init(API_BASE_URL . '/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code === 0) {
        echo "\033[31m[SKIP]\033[0m API server is not running at " . API_BASE_URL . " — start it with `npm run api`.\n";
        exit(2);
    }
}
