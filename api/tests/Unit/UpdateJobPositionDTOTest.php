<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\UpdateJobPositionDTO;
use Http\ApiException;
use PHPUnit\Framework\TestCase;

final class UpdateJobPositionDTOTest extends TestCase
{
    public function testRejectsEmptyUpdate(): void
    {
        $this->expectException(ApiException::class);
        UpdateJobPositionDTO::fromArray([])->validate();
    }

    public function testRejectsTwoParents(): void
    {
        $this->expectException(ApiException::class);
        UpdateJobPositionDTO::fromArray([
            'department_id' => '01HZX0DEPT00000000000000AA',
            'section_id'    => '01HZX0SECT00000000000000BB',
        ])->validate();
    }

    public function testDescriptionOnlyUpdateHasNoParent(): void
    {
        $dto = UpdateJobPositionDTO::fromArray(['description' => 'Nueva descripción']);
        $dto->validate();

        $this->assertFalse($dto->hasParent());
    }

    public function testMovingToUnitSetsParent(): void
    {
        $dto = UpdateJobPositionDTO::fromArray(['unit_id' => '01HZX0UNIT00000000000000EE']);
        $dto->validate();

        $this->assertTrue($dto->hasParent());
        $this->assertSame(['unit_id', '01HZX0UNIT00000000000000EE'], $dto->parent());
    }
}
