<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\CreateJobPositionDTO;
use Http\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CreateJobPositionDTOTest extends TestCase
{
    /** Required fields other than the parent entity under test. */
    private const BASE = [
        'job_position_number' => 'PLZ-001',
        'user_id'             => '01HZX0USER00000000000000AA',
        'job_shift'           => 'Diurna',
        'job_id'              => '01HZX0JOB000000000000000AA',
    ];

    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidPositions(): array
    {
        return [
            'no parent entity' => [self::BASE],
            'two parents'      => [self::BASE + [
                'area_id'       => '01HZX0AREA00000000000000AA',
                'department_id' => '01HZX0DEPT00000000000000AA',
            ]],
            'missing number'   => [[
                'user_id'   => '01HZX0USER00000000000000AA',
                'job_shift' => 'Diurna',
                'job_id'    => '01HZX0JOB000000000000000AA',
                'area_id'   => '01HZX0AREA00000000000000AA',
            ]],
        ];
    }

    /** @param array<string, mixed> $data */
    #[DataProvider('invalidPositions')]
    public function testRejectsInvalidPosition(array $data): void
    {
        $this->expectException(ApiException::class);
        CreateJobPositionDTO::fromArray($data)->validate();
    }

    /** @return array<string, array{string, string}> */
    public static function parentEntities(): array
    {
        return [
            'area'       => ['area_id', '01HZX0AREA00000000000000AA'],
            'department' => ['department_id', '01HZX0DEPT00000000000000BB'],
            'section'    => ['section_id', '01HZX0SECT00000000000000CC'],
            'unit'       => ['unit_id', '01HZX0UNIT00000000000000DD'],
        ];
    }

    #[DataProvider('parentEntities')]
    public function testExactlyOneParentValidates(string $column, string $id): void
    {
        $this->expectNotToPerformAssertions();
        CreateJobPositionDTO::fromArray(self::BASE + [$column => $id])->validate();
    }

    #[DataProvider('parentEntities')]
    public function testParentMapsToCorrectForeignKeyColumn(string $column, string $id): void
    {
        $dto = CreateJobPositionDTO::fromArray(self::BASE + [$column => $id]);

        [$col, $value] = $dto->parent();

        $this->assertSame($column, $col);
        $this->assertSame($id, $value);
    }
}
