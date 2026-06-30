<?php
declare(strict_types=1);

namespace Tests\Unit;

use DTO\CreateSectionDTO;
use Http\ApiException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CreateSectionDTOTest extends TestCase
{
    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidSections(): array
    {
        return [
            'missing area_id'     => [['name' => 'Sección A']],
            'missing name'        => [['area_id' => '01HZX0AREA00000000000000AA']],
            'name over 110 chars' => [['area_id' => '01HZX0AREA00000000000000AA', 'name' => str_repeat('s', 111)]],
        ];
    }

    /** @param array<string, mixed> $data */
    #[DataProvider('invalidSections')]
    public function testRejectsInvalidSection(array $data): void
    {
        $this->expectException(ApiException::class);
        CreateSectionDTO::fromArray($data)->validate();
    }

    public function testAcceptsValidSection(): void
    {
        $this->expectNotToPerformAssertions();
        CreateSectionDTO::fromArray([
            'area_id' => '01HZX0AREA00000000000000AA',
            'name'    => 'Sección Contable',
        ])->validate();
    }
}
