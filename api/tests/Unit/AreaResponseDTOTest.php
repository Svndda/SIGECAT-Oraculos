<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\AreaResponseDTO;
use PHPUnit\Framework\TestCase;

final class AreaResponseDTOTest extends TestCase
{
    public function testMapsUppercaseOracleRowAndExposesAreaId(): void
    {
        $out = AreaResponseDTO::fromArray([
            'AREA_ID'     => '01HZX0AREA00000000000000AA',
            'NAME'        => 'Recursos Humanos',
            'DESCRIPTION' => 'Área de RRHH',
            'CREATED_AT'  => '28-MAY-26 05.34.02.776554 PM',
            'CREATED_BY'  => '01HZX0USER00000000000000BB',
            'IS_DELETED'  => 0,
            'DELETED_AT'  => null,
        ])->toArray();

        // Contract: the frontend expects `area_id`, never `id`.
        $this->assertArrayHasKey('area_id', $out);
        $this->assertArrayNotHasKey('id', $out);
        $this->assertSame('01HZX0AREA00000000000000AA', $out['area_id']);
        $this->assertSame('Recursos Humanos', $out['name']);
        $this->assertSame(0, $out['is_deleted']);
    }

    public function testMapsLowercaseKeysAndPreservesNulls(): void
    {
        $out = AreaResponseDTO::fromArray([
            'area_id'     => '01HZX0AREA00000000000000CC',
            'name'        => 'Finanzas',
            'description' => null,
            'created_at'  => '2026-05-28',
            'created_by'  => '01HZX0USER00000000000000BB',
            'is_deleted'  => 1,
            'deleted_at'  => '2026-05-29',
        ])->toArray();

        $this->assertSame('01HZX0AREA00000000000000CC', $out['area_id']);
        $this->assertNull($out['description']);
    }
}
