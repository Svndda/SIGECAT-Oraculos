<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\RegisterUserDTO;
use Http\ApiException;
use PHPUnit\Framework\TestCase;

final class RegisterUserDTOTest extends TestCase
{
    /** @param array<string, mixed> $data */
    private function validate(array $data): void
    {
        RegisterUserDTO::fromArray($data)->validate();
    }

    public function testRejectsInvalidEmail(): void
    {
        try {
            $this->validate([
                'email'            => 'juan@correo',
                'first_name'       => 'Juan',
                'first_last_name'  => 'Perez',
                'second_last_name' => 'Mora',
                'password'         => 'Demo12345!',
                'role'             => 'employee',
            ]);
            $this->fail('Expected ApiException for an invalid email.');
        } catch (ApiException $e) {
            $code = $e->getError()->jsonSerialize()['code'];
            $this->assertTrue(
                stripos($code, 'EMAIL') !== false || stripos($code, 'INVALID') !== false,
                "Expected an email-related error code, got '$code'."
            );
        }
    }

    public function testAcceptsValidRegistration(): void
    {
        $this->expectNotToPerformAssertions();
        $this->validate([
            'email'            => 'juan.perez@ucr.ac.cr',
            'first_name'       => 'Juan',
            'first_last_name'  => 'Perez',
            'second_last_name' => 'Mora',
            'password'         => 'Demo12345!',
            'role'             => 'employee',
        ]);
    }
}
