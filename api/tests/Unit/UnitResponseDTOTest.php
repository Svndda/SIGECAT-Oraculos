<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\UnitResponseDTO;
use PHPUnit\Framework\TestCase;

final class UnitResponseDTOTest extends TestCase
{
    public function testMapsUppercaseOracleRowUnderDepartment(): void
    {
        $out = UnitResponseDTO::fromArray([
            'UNIT_ID'       => '01HZX0UNIT00000000000000AA',
            'SECTION_ID'    => null,
            'DEPARTMENT_ID' => '01HZX0DEPT00000000000000BB',
            'NAME'          => 'Unidad de Nómina',
            'DESCRIPTION'   => null,
            'CREATED_AT'    => '28-MAY-26 05.34.02.776554 PM',
            'CREATED_BY'    => '01HZX0USER00000000000000CC',
            'IS_DELETED'    => 0,
            'DELETED_AT'    => null,
        ])->toArray();

        $this->assertSame('01HZX0UNIT00000000000000AA', $out['id']);
        $this->assertSame('01HZX0DEPT00000000000000BB', $out['department_id']);
        $this->assertNull($out['section_id']);
        $this->assertSame('Unidad de Nómina', $out['name']);
        $this->assertSame(0, $out['is_deleted']);
    }

    public function testMapsLowercaseRowUnderSection(): void
    {
        $out = UnitResponseDTO::fromArray([
            'unit_id'    => '01HZX0UNIT00000000000000DD',
            'section_id' => '01HZX0SECT00000000000000EE',
            'name'       => 'Unidad de Auditoría',
            'created_at' => '2026-05-28',
            'created_by' => '01HZX0USER00000000000000CC',
            'is_deleted' => 1,
        ])->toArray();

        $this->assertSame('01HZX0SECT00000000000000EE', $out['section_id']);
        $this->assertNull($out['department_id']);
        $this->assertSame(1, $out['is_deleted']);
    }
}
