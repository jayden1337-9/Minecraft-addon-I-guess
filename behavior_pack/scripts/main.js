import { world, system, ItemStack } from "@minecraft/server";

const MAX_LEVEL = 2000;
const START_MANA = 100;
const MANA_PER_LEVEL = 25;

const cooldowns = new Map();

const ABILITIES = {
    "arcane:ember_blade": {
        name: "Flame Nova",
        cost: 25,
        cooldown: 8,
        radius: 5,
        damage: 14
    },
    "arcane:storm_spear": {
        name: "Thunder Call",
        cost: 30,
        cooldown: 10,
        radius: 10,
        damage: 18
    },
    "arcane:void_dagger": {
        name: "Void Veil",
        cost: 20,
        cooldown: 12
    },
    "arcane:gravity_maul": {
        name: "Gravity Slam",
        cost: 40,
        cooldown: 14,
        radius: 6,
        damage: 12
    },
    "arcane:lifebloom_staff": {
        name: "Lifebloom",
        cost: 25,
        cooldown: 18
    }
};

function getNumber(player, key, fallback = 0) {
    const value = player.getDynamicProperty(key);
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function level(player) {
    return Math.floor(Math.min(MAX_LEVEL, Math.max(1, getNumber(player, "arcane:level", 1))));
}

function maxMana(player) {
    return START_MANA + (level(player) - 1) * MANA_PER_LEVEL;
}

function mana(player) {
    return Math.min(maxMana(player), Math.max(0, getNumber(player, "arcane:mana", START_MANA)));
}

function xpNeeded(currentLevel) {
    return 50 + currentLevel * 35;
}

function setMana(player, amount) {
    player.setDynamicProperty(
        "arcane:mana",
        Math.max(0, Math.min(maxMana(player), amount))
    );
}

function giveXP(player, amount) {
    if (level(player) >= MAX_LEVEL) return;

    let xp = getNumber(player, "arcane:xp", 0) + amount;
    let currentLevel = level(player);

    while (currentLevel < MAX_LEVEL && xp >= xpNeeded(currentLevel)) {
        xp -= xpNeeded(currentLevel);
        currentLevel++;

        player.setDynamicProperty("arcane:level", currentLevel);
        player.setDynamicProperty("arcane:mana", maxMana(player));

        player.sendMessage(
            `§6§lARCANE LEVEL UP! §r§eLevel ${currentLevel} reached!`
        );
        player.sendMessage("§bYour maximum mana has increased.");
    }

    if (currentLevel >= MAX_LEVEL) xp = 0;
    player.setDynamicProperty("arcane:xp", xp);
}

function nearbyEntities(player, radius) {
    return player.dimension.getEntities({
        location: player.location,
        maxDistance: radius
    }).filter(entity =>
        entity.id !== player.id &&
        entity.typeId !== "minecraft:player"
    );
}

function consumeOne(player, typeId) {
    const inventory = player.getComponent("minecraft:inventory");
    const container = inventory?.container;
    if (!container) return false;

    for (let i = 0; i < container.size; i++) {
        const stack = container.getItem(i);
        if (!stack || stack.typeId !== typeId) continue;

        if (stack.amount > 1) {
            container.setItem(i, new ItemStack(typeId, stack.amount - 1));
        } else {
            container.setItem(i, undefined);
        }
        return true;
    }

    return false;
}

function safelyDamage(entity, amount) {
    try {
        entity.applyDamage(amount);
    } catch {}
}

function safelyAddEffect(entity, effect, duration, amplifier = 0, particles = true) {
    try {
        entity.addEffect(effect, duration, {
            amplifier,
            showParticles: particles
        });
    } catch {}
}

function useAbility(player, itemId) {
    const ability = ABILITIES[itemId];
    if (!ability) return;

    const now = system.currentTick;
    const key = `${player.id}:${itemId}`;
    const ready = cooldowns.get(key) || 0;

    if (now < ready) {
        player.sendMessage(`§cCooling down: ${((ready - now) / 20).toFixed(1)}s`);
        return;
    }

    if (mana(player) < ability.cost) {
        player.sendMessage(`§cNot enough mana! ${ability.cost} needed.`);
        return;
    }

    setMana(player, mana(player) - ability.cost);
    cooldowns.set(key, now + ability.cooldown * 20);

    // Progression improves abilities gradually without extreme damage scaling.
    const power = 1 + Math.log2(level(player)) * 0.35;

    if (itemId === "arcane:ember_blade") {
        for (const entity of nearbyEntities(player, ability.radius)) {
            safelyDamage(entity, Math.round(ability.damage * power));
        }
        player.sendMessage("§6Flame Nova unleashed!");
    } else if (itemId === "arcane:storm_spear") {
        const direction = player.getViewDirection();

        for (const entity of nearbyEntities(player, ability.radius)) {
            const dx = entity.location.x - player.location.x;
            const dy = entity.location.y - player.location.y;
            const dz = entity.location.z - player.location.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            const dot = (dx * direction.x + dy * direction.y + dz * direction.z) / distance;

            if (dot > 0.45) {
                safelyDamage(entity, Math.round(ability.damage * power));
                safelyAddEffect(entity, "slowness", 40, 1);
            }
        }
        player.sendMessage("§bThunder Call unleashed!");
    } else if (itemId === "arcane:void_dagger") {
        safelyAddEffect(player, "invisibility", 80, 0, false);
        safelyAddEffect(player, "speed", 80, 2);
        player.sendMessage("§5Void Veil activated!");
    } else if (itemId === "arcane:gravity_maul") {
        for (const entity of nearbyEntities(player, ability.radius)) {
            safelyDamage(entity, Math.round(ability.damage * power));
            safelyAddEffect(entity, "slowness", 80, 3);
        }
        player.sendMessage("§8Gravity Slam unleashed!");
    } else if (itemId === "arcane:lifebloom_staff") {
        safelyAddEffect(player, "regeneration", 160, 2);
        safelyAddEffect(player, "absorption", 160, 0);
        player.sendMessage("§aLifebloom activated!");
    }
}

world.afterEvents.playerSpawn.subscribe(event => {
    const player = event.player;

    if (getNumber(player, "arcane:level", 0) < 1) {
        player.setDynamicProperty("arcane:level", 1);
        player.setDynamicProperty("arcane:xp", 0);
        player.setDynamicProperty("arcane:mana", START_MANA);
    }
});

world.afterEvents.itemUse.subscribe(event => {
    const player = event.source;
    const item = event.itemStack;

    if (!player || player.typeId !== "minecraft:player" || !item) return;

    if (item.typeId === "arcane:mana_crystal") {
        const missingMana = maxMana(player) - mana(player);
        if (missingMana <= 0) {
            player.sendMessage("§bYour mana is already full.");
            return;
        }
        if (!consumeOne(player, item.typeId)) return;

        const restored = Math.min(65, missingMana);
        setMana(player, mana(player) + restored);
        player.sendMessage(`§bMana Crystal used. Restored ${restored} mana.`);
        return;
    }

    if (item.typeId === "arcane:arcane_essence") {
        if (!consumeOne(player, item.typeId)) return;
        giveXP(player, 25);
        player.sendMessage("§dArcane Essence consumed. §a+25 XP");
        return;
    }

    useAbility(player, item.typeId);
});

world.afterEvents.entityDie.subscribe(event => {
    const killer = event.damageSource.damagingEntity;
    const dead = event.deadEntity;

    if (!killer || killer.typeId !== "minecraft:player") return;
    if (!dead || dead.typeId === "minecraft:player") return;

    giveXP(killer, 15);
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const current = mana(player);
        const maximum = maxMana(player);

        if (current < maximum) setMana(player, current + 2);

        const currentLevel = level(player);
        const currentXP = getNumber(player, "arcane:xp", 0);
        const needed = xpNeeded(currentLevel);
        const barLength = 10;
        const filled = Math.min(barLength, Math.floor((currentXP / needed) * barLength));
        const bar = "§a" + "▰".repeat(filled) + "§8" + "▱".repeat(barLength - filled);

        player.onScreenDisplay.setActionBar(
            `§bMana ${mana(player)}/${maximum} §8| §6Lv.${currentLevel} §8| ${bar} §f${currentXP}/${needed} XP`
        );
    }
}, 20);

// Show a temporary health label for the mob a player is looking at.
const healthNameTags = new Map();

system.runInterval(() => {
    const currentlyViewed = new Map();

    for (const player of world.getAllPlayers()) {
        try {
            const hits = player.getEntitiesFromViewDirection({ maxDistance: 32 });
            const target = hits.length > 0 ? hits[0].entity : undefined;
            if (!target || target.typeId === "minecraft:player") continue;

            const health = target.getComponent("minecraft:health");
            if (!health) continue;

            const current = Math.max(0, Math.ceil(health.currentValue));
            const maximum = Math.ceil(health.effectiveMax || health.defaultValue || current);
            currentlyViewed.set(target.id, { entity: target, current, maximum });
        } catch {}
    }

    for (const [id, saved] of healthNameTags) {
        if (!currentlyViewed.has(id)) {
            try { saved.entity.nameTag = saved.originalNameTag; } catch {}
            healthNameTags.delete(id);
        }
    }

    for (const [id, viewed] of currentlyViewed) {
        try {
            let saved = healthNameTags.get(id);
            if (!saved) {
                saved = {
                    entity: viewed.entity,
                    originalNameTag: viewed.entity.nameTag
                };
                healthNameTags.set(id, saved);
            }

            const mobName = saved.originalNameTag || viewed.entity.typeId
                .replace("minecraft:", "")
                .replaceAll("_", " ");
            viewed.entity.nameTag =
                `§f${mobName}\n§c❤ §f${viewed.current}§7/§f${viewed.maximum}`;
        } catch {}
    }
}, 5);

console.warn("[Arcane Arsenal] Gameplay system loaded.");
