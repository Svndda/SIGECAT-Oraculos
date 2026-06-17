<?php
declare(strict_types= 1);

namespace DTO;
use Http\ApiException;
use Http\ErrorType;

/**
 * Validates an email address.
 *
 * This class normalizes the input and checks that:
 * - The email is not empty
 * - The format is valid
 * - The domain is "ucr.ac.cr"
 *
 * Throws an ApiException if any validation fails.
 */
class EmailValidator {
  public static function validate(string $email): void {
    // Normalize the email address
    $email = strtolower(trim($email));

    if (empty($email) === TRUE) {
      throw new ApiException(ErrorType::missingField("email"));
    }

    // Length limit mirrors the USERS.email column to avoid an ORA-12899.
    if (strlen($email) > 255) {
      throw new ApiException(ErrorType::invalidField("email", "No puede exceder los 255 caracteres"));
    }

    if (filter_var($email, FILTER_VALIDATE_EMAIL) === FALSE) {
      throw new ApiException(ErrorType::invalidEmail());
    }

    [$local, $domain] = explode('@', $email);
    if ($domain !== 'ucr.ac.cr') {
      throw new ApiException(ErrorType::from("INVALID_EMAIL" ,"El dominio de email es inválido"));
    }
  }
}