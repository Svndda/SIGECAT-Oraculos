<?php
declare(strict_types=1);

namespace Http;

use JsonSerializable;

/**
 * Class ErrorType
 * 
 * Standardizes API error responses by providing unique machine-readable codes 
 * and human-readable descriptive messages.
 * 
 * @package Http
 */
final class ErrorType implements JsonSerializable
{
	/** @var string The human-readable explanation of the error. */
	private string $message;

	/** @var string The machine-readable unique identifier (e.g., 'INVALID_JSON'). */
	private string $type;

	/**
	 * Internal constructor to enforce the use of static factory methods.
	 * 
	 * @param string $type Machine-readable error code.
	 * @param string $message Human-readable error message.
	 */
	private function __construct(string $type, string $message)
	{
		$this->type = $type;
		$this->message = $message;
	}

	/**
	 * Defines how the object should be serialized by json_encode().
	 * 
	 * @return array{code: string, message: string}
	 */
	public function jsonSerialize(): array
	{
		return [
			'code' => $this->type,
			'message' => $this->message,
		];
	}

	/**
	 * Creates a custom ErrorType instance from a raw code and message.
	 * 
	 * @param string $code Unique error identifier.
	 * @param string $message Descriptive error message.
	 * @return self
	 */
	public static function from(string $code, string $message): self
	{
		return new self($code, $message);
	}

	/**
	 * Triggered when the request body is not a valid JSON or is malformed.
	 * 
	 * @return self
	 */
	public static function invalidJson(): self
	{
		return new self('INVALID_JSON', 'El cuerpo de la solicitud (JSON) está malformado o no es válido');
	}

	/**
	 * Triggered when a specific field fails validation logic.
	 * 
	 * @param string $field The name of the invalid field.
	 * @return self
	 */
	public static function invalidField(string $field): self
	{
		return new self("INVALID_FIELD", "El valor proporcionado para el campo '{$field}' no es válido");
	}

	/**
	 * Triggered when a required field is missing from the payload.
	 * 
	 * @param string $field The name of the missing field.
	 * @return self
	 */
	public static function missingField(string $field): self
	{
		return new self("MISSING_FIELD", "El campo obligatorio '{$field}' no se encuentra en la solicitud");
	}

	/**
	 * Triggered when the provided email does not follow a valid format.
	 * 
	 * @return self
	 */
	public static function invalidEmail(): self
	{
		return new self('INVALID_EMAIL', 'El formato del correo electrónico no es válido');
	}

	/**
	 * Triggered when attempting to register an email that already exists in the database.
	 * 
	 * @return self
	 */
	public static function emailAlreadyInUse(): self
	{
		return new self('EMAIL_ALREADY_IN_USE', 'El correo electrónico proporcionado ya se encuentra registrado');
	}

	/**
	 * Triggered when a password does not meet the minimum complexity requirements.
	 * 
	 * @return self
	 */
	public static function weakPassword(): self
	{
		return new self(
			'WEAK_PASSWORD',
			'La contraseña debe contener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales'
		);
	}

	/**
	 * Triggered on failed login attempts due to wrong email or password.
	 * 
	 * @return self
	 */
	public static function invalidCredentials(): self
	{
		return new self('INVALID_CREDENTIALS', 'El correo electrónico o la contraseña son incorrectos');
	}

	/**
	 * Triggered when an error occurs during user profile modification.
	 * 
	 * @return self
	 */
	public static function userUpdateFailed(): self
	{
		return new self('USER_UPDATE_FAILED', 'No se pudo actualizar la información del usuario');
	}

	/**
	 * Triggered when a user account cannot be removed from the system.
	 * 
	 * @return self
	 */
	public static function userDeleteFailed(): self
	{
		return new self('USER_DELETE_FAILED', 'No se pudo eliminar la cuenta de usuario');
	}

	/**
	 * Triggered when a protected endpoint is accessed without an Authorization header.
	 * 
	 * @return self
	 */
	public static function missingAuthToken(): self
	{
		return new self('MISSING_AUTH_TOKEN', 'Se requiere un inicio de sesión para realizar esta acción');
	}

	/**
	 * Triggered when the Access Token is malformed, tampered with, or expired.
	 * 
	 * @return self
	 */
	public static function invalidAccessToken(): self
	{
		return new self('INVALID_ACCESS_TOKEN', 'El token no es válido o ha expirado');
	}

	/**
	 * Triggered when the Refresh Token is invalid or expired during token rotation.
	 * 
	 * @return self
	 */
	public static function invalidRefreshToken(): self
	{
		return new self('INVALID_REFRESH_TOKEN', 'El token no es válido o ha expirado');
	}

	/**
	 * Triggered when a logout is attempted on an already closed session.
	 * 
	 * @return self
	 */
	public static function sessionAlreadyRevoked(): self
	{
		return new self('SESSION_ALREADY_REVOKED', 'La sesión ya ha sido revocada previamente');
	}

	/**
	 * Triggered when the system fails to clear the session context.
	 * 
	 * @return self
	 */
	public static function logoutFailed(): self
	{
		return new self('LOGOUT_FAILED', 'No se pudo cerrar la sesión del usuario');
	}

	/**
	 * General unauthorized access error.
	 * 
	 * @param string $message Custom unauthorized message.
	 * @return self
	 */
	public static function unauthorized(string $message = 'Unauthorized'): self
	{
		return new self('UNAUTHORIZED', $message);
	}

	/**
	 * Triggered when a user tries to access a resource they do not have permission for.
	 * 
	 * @return self
	 */
	public static function forbidden(): self
	{
		return new self('FORBIDDEN_ACCESS', 'El acceso a este recurso está estrictamente prohibido');
	}

	/**
	 * Triggered when a requested resource (User, Record, File) does not exist.
	 * 
	 * @param string $resource The name of the missing resource.
	 * @return self
	 */
	public static function notFound(string $resource = 'Resource'): self
	{
		return new self("NOT_FOUND", "El recurso '{$resource}' no pudo ser localizado");
	}

	/**
	 * Triggered when a request conflicts with the current state of the server (e.g., duplicates).
	 * 
	 * @param string $message Custom conflict details.
	 * @return self
	 */
	public static function conflict(string $message = 'Conflict'): self
	{
		return new self('CONFLICT_ERROR', $message);
	}

	/**
	 * Fallback for unexpected server-side failures.
	 * 
	 * @param string $detail Technical detail (use with caution in production).
	 * @return self
	 */
	public static function internal(string $detail = 'Unexpected error'): self
	{
		return new self('INTERNAL_ERROR', $detail);
	}

	/**
	 * Maps the internal error type to a standard HTTP status code.
	 * 
	 * @return int Valid HTTP status code (200-599).
	 */
	public function getStatusCode(): int
	{
		return match ($this->type) {
			'NOT_FOUND' => 404,
			'UNAUTHORIZED', 'INVALID_ACCESS_TOKEN', 'MISSING_AUTH_TOKEN' => 401,
			'FORBIDDEN_ACCESS' => 403,
			'INVALID_JSON', 'INVALID_FIELD', 'MISSING_FIELD', 'INVALID_EMAIL', 'WEAK_PASSWORD' => 400,
			'CONFLICT_ERROR', 'EMAIL_ALREADY_IN_USE' => 409,
			default => 500,
		};
	}
}