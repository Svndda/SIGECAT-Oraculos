<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\CreateDepartmentDTO;
use Http\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CreateDepartmentDTOTest extends TestCase
{
    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidDepartments(): array
    {
        return [
            'missing area_id'     => [['name' => 'Reclutamiento']],
            'missing name'        => [['area_id' => '01HZX0AREA00000000000000AA']],
            'name over 110 chars' => [['area_id' => '01HZX0AREA00000000000000AA', 'name' => str_repeat('a', 111)]],
        ];
    }

    /** @param array<string, mixed> $data */
    #[DataProvider('invalidDepartments')]
    public function testRejectsInvalidDepartment(array $data): void
    {
        $this->expectException(ApiException::class);
        CreateDepartmentDTO::fromArray($data)->validate();
    }

    public function testAcceptsValidDepartment(): void
    {
        $this->expectNotToPerformAssertions();
        CreateDepartmentDTO::fromArray([
            'area_id'     => '01HZX0AREA00000000000000AA',
            'name'        => 'Reclutamiento',
            'description' => 'Departamento de reclutamiento',
        ])->validate();
    }
}
