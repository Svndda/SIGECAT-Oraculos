<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\AreaRequestDTO;
use Http\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AreaRequestDTOTest extends TestCase
{
    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidAreas(): array
    {
        return [
            'empty name'           => [['name' => '']],
            'name over 110 chars'  => [['name' => str_repeat('a', 111)]],
            'description over 255' => [['name' => 'Recursos Humanos', 'description' => str_repeat('x', 256)]],
        ];
    }

    /** @param array<string, mixed> $data */
    #[DataProvider('invalidAreas')]
    public function testRejectsInvalidArea(array $data): void
    {
        $this->expectException(ApiException::class);
        AreaRequestDTO::fromArray($data)->validate();
    }

    public function testAcceptsValidArea(): void
    {
        $this->expectNotToPerformAssertions();
        AreaRequestDTO::fromArray(['name' => 'Recursos Humanos', 'description' => 'Área de RRHH'])->validate();
    }
}
