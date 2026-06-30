<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\PasswordValidator;
use Http\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PasswordValidatorTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function weakPasswords(): array
    {
        return [
            'too short'         => ['1234'],
            'no uppercase'      => ['abcdef1!'],
            'no number'         => ['Abcdefg!'],
            'no special char'   => ['Abcdefg1'],
        ];
    }

    #[DataProvider('weakPasswords')]
    public function testRejectsWeakPassword(string $password): void
    {
        try {
            PasswordValidator::validate($password);
            $this->fail('Expected ApiException for a weak password.');
        } catch (ApiException $e) {
            $this->assertSame('WEAK_PASSWORD', $e->getError()->jsonSerialize()['code']);
        }
    }

    public function testAcceptsStrongPassword(): void
    {
        $this->expectNotToPerformAssertions();
        PasswordValidator::validate('Demo12345!');
    }
}
