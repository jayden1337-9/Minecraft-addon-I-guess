package dev.jayden.arcane;

import net.fabricmc.api.ModInitializer;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockBehaviour;

/**
 * Arcane Arsenal entrypoint. Registers the mod's custom items and blocks.
 * Gameplay hooks are kept out of this bootstrap class so the mod remains
 * compatible with the current Minecraft 26.3 item API.
 */
public final class ArcaneArsenal implements ModInitializer {
    public static final String MOD_ID = "arcane";

    private static Identifier id(String path) {
        return Identifier.fromNamespaceAndPath(MOD_ID, path);
    }

    private static Item.Properties itemProperties(String path) {
        return new Item.Properties().setId(ResourceKey.create(Registries.ITEM, id(path)));
    }

    private static BlockBehaviour.Properties blockProperties(String path, Block copy) {
        return BlockBehaviour.Properties.ofFullCopy(copy)
            .setId(ResourceKey.create(Registries.BLOCK, id(path)));
    }

    private static Item registerItem(String path, Item item) {
        return Registry.register(BuiltInRegistries.ITEM, id(path), item);
    }

    private static Block registerBlock(String path, Block block) {
        return Registry.register(BuiltInRegistries.BLOCK, id(path), block);
    }

    public static final Item EMBER_BLADE =
        registerItem("ember_blade", new Item(itemProperties("ember_blade").stacksTo(1)));
    public static final Item STORM_SPEAR =
        registerItem("storm_spear", new Item(itemProperties("storm_spear").stacksTo(1)));
    public static final Item VOID_DAGGER =
        registerItem("void_dagger", new Item(itemProperties("void_dagger").stacksTo(1)));
    public static final Item GRAVITY_MAUL =
        registerItem("gravity_maul", new Item(itemProperties("gravity_maul").stacksTo(1)));
    public static final Item LIFEBLOOM_STAFF =
        registerItem("lifebloom_staff", new Item(itemProperties("lifebloom_staff").stacksTo(1)));
    public static final Item ARCANE_ESSENCE =
        registerItem("arcane_essence", new Item(itemProperties("arcane_essence")));
    public static final Item MANA_CRYSTAL =
        registerItem("mana_crystal", new Item(itemProperties("mana_crystal").stacksTo(16)));

    public static final Block ARCANE_CRYSTAL_ORE = registerBlock(
        "arcane_crystal_ore",
        new Block(blockProperties("arcane_crystal_ore", Blocks.DEEPSLATE)
            .strength(4.0F).requiresCorrectToolForDrops())
    );
    public static final Item ARCANE_CRYSTAL_ORE_ITEM =
        registerItem("arcane_crystal_ore",
            new BlockItem(ARCANE_CRYSTAL_ORE, itemProperties("arcane_crystal_ore")));

    public static final Block RUNE_STONE = registerBlock(
        "rune_stone",
        new Block(blockProperties("rune_stone", Blocks.CRYING_OBSIDIAN).strength(3.0F))
    );
    public static final Item RUNE_STONE_ITEM =
        registerItem("rune_stone", new BlockItem(RUNE_STONE, itemProperties("rune_stone")));

    @Override
    public void onInitialize() {
        // Static registrations above are completed when this entrypoint loads.
    }
}
