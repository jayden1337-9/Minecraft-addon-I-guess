package dev.jayden.arcane;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockBehaviour;

public class ArcaneArsenal implements ModInitializer {
    public static final String MOD_ID = "arcane";
    private static final Map<UUID, Integer> MANA = new ConcurrentHashMap<>();
    private static final Map<UUID, Integer> LEVEL = new ConcurrentHashMap<>();
    private static final Map<UUID, Integer> XP = new ConcurrentHashMap<>();

    private static Identifier id(String path) { return Identifier.fromNamespaceAndPath(MOD_ID, path); }
    private static Item.Properties itemProps(String path) {
        return new Item.Properties().setId(ResourceKey.create(Registries.ITEM, id(path)));
    }
    private static BlockBehaviour.Properties blockProps(String path, Block copy) {
        return BlockBehaviour.Properties.ofFullCopy(copy).setId(ResourceKey.create(Registries.BLOCK, id(path)));
    }
    private static Item item(String path, Item item) { return Registry.register(BuiltInRegistries.ITEM, id(path), item); }

    public static final Item EMBER_BLADE = item("ember_blade", new ArcaneWeaponItem(Ability.EMBER, itemProps("ember_blade").stacksTo(1)));
    public static final Item STORM_SPEAR = item("storm_spear", new ArcaneWeaponItem(Ability.STORM, itemProps("storm_spear").stacksTo(1)));
    public static final Item VOID_DAGGER = item("void_dagger", new ArcaneWeaponItem(Ability.VOID, itemProps("void_dagger").stacksTo(1)));
    public static final Item GRAVITY_MAUL = item("gravity_maul", new ArcaneWeaponItem(Ability.GRAVITY, itemProps("gravity_maul").stacksTo(1)));
    public static final Item LIFEBLOOM_STAFF = item("lifebloom_staff", new ArcaneWeaponItem(Ability.LIFE, itemProps("lifebloom_staff").stacksTo(1)));
    public static final Item ARCANE_ESSENCE = item("arcane_essence", new Item(itemProps("arcane_essence")));
    public static final Item MANA_CRYSTAL = item("mana_crystal", new Item(itemProps("mana_crystal").stacksTo(16)));
    public static final Block ARCANE_ORE = Registry.register(BuiltInRegistries.BLOCK, id("arcane_crystal_ore"),
        new Block(blockProps("arcane_crystal_ore", Blocks.DEEPSLATE).strength(4.0F).requiresCorrectToolForDrops()));
    public static final Item ARCANE_ORE_ITEM = item("arcane_crystal_ore", new BlockItem(ARCANE_ORE, itemProps("arcane_crystal_ore")));
    public static final Block RUNE_STONE = Registry.register(BuiltInRegistries.BLOCK, id("rune_stone"),
        new Block(blockProps("rune_stone", Blocks.CRYING_OBSIDIAN).strength(3.0F)));
    public static final Item RUNE_STONE_ITEM = item("rune_stone", new BlockItem(RUNE_STONE, itemProps("rune_stone")));

    @Override
    public void onInitialize() {
        ItemGroupEvents.modifyEntriesEvent(CreativeModeTabs.COMBAT).register(entries -> {
            entries.accept(EMBER_BLADE); entries.accept(STORM_SPEAR); entries.accept(VOID_DAGGER);
            entries.accept(GRAVITY_MAUL); entries.accept(LIFEBLOOM_STAFF);
        });
        ItemGroupEvents.modifyEntriesEvent(CreativeModeTabs.INGREDIENTS).register(entries -> {
            entries.accept(ARCANE_ESSENCE); entries.accept(MANA_CRYSTAL); entries.accept(ARCANE_ORE_ITEM); entries.accept(RUNE_STONE_ITEM);
        });
        ServerTickEvents.END_SERVER_TICK.register(server -> server.getPlayerList().getPlayers().forEach(player -> {
            UUID uuid = player.getUUID();
            int level = LEVEL.getOrDefault(uuid, 1);
            MANA.compute(uuid, (key, value) -> Math.min(100 + level * 10, (value == null ? 100 : value) + 1));
            if (player.tickCount % 20 == 0) {
                player.displayClientMessage(net.minecraft.network.chat.Component.literal(
                    "§5✦ §dMana " + MANA.getOrDefault(uuid, 100) + "/" + (100 + level * 10) +
                    " §7| §bLevel " + level + " §7| §eXP " + XP.getOrDefault(uuid, 0) + "/" + (level * 100)), true);
            }
        }));
    }

    public enum Ability { EMBER, STORM, VOID, GRAVITY, LIFE }

    public static class ArcaneWeaponItem extends Item {
        private final Ability ability;
        public ArcaneWeaponItem(Ability ability, Item.Properties properties) { super(properties); this.ability = ability; }

        @Override
        public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
            ItemStack stack = player.getItemInHand(hand);
            if (level.isClientSide()) return InteractionResultHolder.pass(stack);
            UUID uuid = player.getUUID();
            int mana = MANA.getOrDefault(uuid, 100);
            int cost = ability == Ability.LIFE ? 18 : 25;
            if (mana < cost) {
                player.displayClientMessage(net.minecraft.network.chat.Component.literal("§cNot enough mana!"), true);
                return InteractionResultHolder.fail(stack);
            }
            MANA.put(uuid, mana - cost);
            switch (ability) {
                case EMBER -> {
                    for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(4), e -> e != player)) {
                        target.hurtServer((net.minecraft.server.level.ServerLevel) level, level.damageSources().magic(), 9.0F);
                        target.igniteForSeconds(4);
                    }
                    player.displayClientMessage(net.minecraft.network.chat.Component.literal("§6✦ Flame Nova!"), true);
                }
                case STORM -> {
                    for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(7), e -> e != player))
                        target.hurtServer((net.minecraft.server.level.ServerLevel) level, level.damageSources().lightningBolt(), 12.0F);
                    player.displayClientMessage(net.minecraft.network.chat.Component.literal("§b✦ Thunder Call!"), true);
                }
                case VOID -> {
                    player.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 100, 0));
                    player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 100, 1));
                    player.displayClientMessage(net.minecraft.network.chat.Component.literal("§5✦ Void Veil!"), true);
                }
                case GRAVITY -> {
                    for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(5), e -> e != player)) {
                        target.hurtServer((net.minecraft.server.level.ServerLevel) level, level.damageSources().magic(), 10.0F);
                        target.push(0, 1.1, 0);
                    }
                    player.displayClientMessage(net.minecraft.network.chat.Component.literal("§d✦ Gravity Slam!"), true);
                }
                case LIFE -> {
                    player.heal(12.0F);
                    player.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 100, 1));
                    player.displayClientMessage(net.minecraft.network.chat.Component.literal("§a✦ Lifebloom!"), true);
                }
            }
            player.getCooldowns().addCooldown(this, 40);
            int currentLevel = LEVEL.getOrDefault(uuid, 1);
            int nextXp = XP.getOrDefault(uuid, 0) + 20;
            if (nextXp >= currentLevel * 100) {
                XP.put(uuid, nextXp - currentLevel * 100);
                LEVEL.put(uuid, Math.min(2000, currentLevel + 1));
                player.displayClientMessage(net.minecraft.network.chat.Component.literal("§dArcane level up! §fLevel " + LEVEL.get(uuid)), true);
            } else XP.put(uuid, nextXp);
            return InteractionResultHolder.success(stack);
        }
    }
}