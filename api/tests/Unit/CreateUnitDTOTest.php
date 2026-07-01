<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\CreateUnitDTO;
use Http\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CreateUnitDTOTest extends TestCase
{
    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidUnits(): array
    {
        return [
            'missing name'                 => [['department_id' => '01HZX0DEPT00000000000000AA']],
            'no department nor section'    => [['name' => 'Unidad X']],
        ];
    }

    /** @param array<string, mixed> $data */
    #[DataProvider('invalidUnits')]
    public function testRejectsInvalidUnit(array $data): void
    {
        $this->expectException(ApiException::class);
        CreateUnitDTO::fromArray($data)->validate();
    }

    public function testAcceptsUnitUnderDepartment(): void
    {
        $this->expectNotToPerformAssertions();
        CreateUnitDTO::fromArray([
            'name'          => 'Unidad de Nómina',
            'department_id' => '01HZX0DEPT00000000000000AA',
        ])->validate();
    }

    public function testAcceptsUnitUnderSection(): void
    {
        $this->expectNotToPerformAssertions();
        CreateUnitDTO::fromArray([
            'name'       => 'Unidad de Auditoría',
            'section_id' => '01HZX0SECT00000000000000AA',
        ])->validate();
    }
}
