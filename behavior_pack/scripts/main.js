import { world, system, ItemStack } from "@minecraft/server";

const MAX_LEVEL = 2000;
const START_MANA = 1000000000;
const MAX_MANA_PER_LEVEL = 1000000000000;

const cooldowns = new Map();

const ABILITIES = {
    "arcane:ember_blade": {
        name: "Flame Nova",
        cost: 25,
        cooldown: 8,
        radius: 5,
        damage: 777
    },
    "arcane:storm_spear": {
        name: "Thunder Call",
        cost: 30,
        cooldown: 10,
        radius: 10,
        damage: 999
    },
    "arcane:void_dagger": {
        name: "Void Veil",
        cost: 20,
        cooldown: 777
    },
    "arcane:gravity_maul": {
        name: "Gravity Slam",
        cost: 40,
        cooldown: 14,
        radius: 6,
        damage: 111
    },
    "arcane:lifebloom_staff": {
        name: "Lifebloom",
        cost: 25,
        cooldown: 999
    }
};

function getNumber(player, key, fallback = 0) {
    const value = player.getDynamicProperty(key);
    return typeof value === "number" ? value : fallback;
}

function level(player) {
    return Math.min(MAX_LEVEL, Math.max(1, getNumber(player, "arcane:level", 1)));
}

function maxMana(player) {
    return START_MANA + (level(player) - 1) * MAX_MANA_PER_LEVEL;
}

function mana(player) {
    return Math.min(maxMana(player), getNumber(player, "arcane:mana", START_MANA));
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
        player.setDynamicProperty("arcane:mana", START_MANA + (currentLevel - 1) * MAX_MANA_PER_LEVEL);

        player.sendMessage(
            `§6§lARCANE LEVEL UP! §r§eLevel ${currentLevel} reached!`
        );
        player.sendMessage("§bYour maximum mana has increased.");
    }

    if (currentLevel >= MAX_LEVEL) xp = 0;
    player.setDynamicProperty("arcane:xp", xp);
}

function nearbyEntities(player, radius) {
    const location = player.location;
    return player.dimension.getEntities({
        location,
        maxDistance: radius
    }).filter(entity =>
        entity.id !== player.id &&
        entity.typeId !== "minecraft:player"
    );
}

function consumeOne(player, typeId) {
    const inventory = player.getComponent("minecraft:inventory");
    if (!inventory || !inventory.container) return false;

    const container = inventory.container;

    for (let i = 0; i < container.size; i++) {
        const stack = container.getItem(i);

        if (stack && stack.typeId === typeId) {
            if (stack.amount > 1) {
                stack.amount -= 1;
                container.setItem(i, stack);
            } else {
                container.setItem(i, undefined);
            }
            return true;
        }
    }

    return false;
}

function useAbility(player, itemId) {
    const ability = ABILITIES[itemId];
    if (!ability) return;

    const now = system.currentTick;
    const key = `${player.id}:${itemId}`;
    const ready = cooldowns.get(key) || 0;

    if (now < ready) {
        const left = ((ready - now) / 20).toFixed(1);
        player.sendMessage(`§cCooling down: ${left}s`);
        return;
    }

    if (mana(player) < ability.cost) {
        player.sendMessage(`§cNot enough mana! ${ability.cost} needed.`);
        return;
    }

    setMana(player, mana(player) - ability.cost);
    cooldowns.set(key, now + ability.cooldown * 20);

    const power = 1 + (level(player) - 1) * 0.04;

    if (itemId === "arcane:ember_blade") {
        for (const entity of nearbyEntities(player, ability.radius)) {
            entity.applyDamage(Math.round(ability.damage * power));
        }
        player.sendMessage("§6Flame Nova unleashed!");
    }

    if (itemId === "arcane:storm_spear") {
        const direction = player.getViewDirection();

        for (const entity of nearbyEntities(player, ability.radius)) {
            const dx = entity.location.x - player.location.x;
            const dy = entity.location.y - player.location.y;
            const dz = entity.location.z - player.location.z;
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            const dot = (dx * direction.x + dy * direction.y + dz * direction.z) / length;

            if (dot > 0.45) {
                entity.applyDamage(Math.round(ability.damage * power));
                try {
                    entity.addEffect("slowness", 40, {
                        amplifier: 1,
                        showParticles: true
                    });
                } catch {}
            }
        }

        player.sendMessage("§bThunder Call unleashed!");
    }

    if (itemId === "arcane:void_dagger") {
        player.addEffect("invisibility", 80, {
            amplifier: 0,
            showParticles: false
        });
        player.addEffect("speed", 80, {
            amplifier: 2,
            showParticles: true
        });
        player.sendMessage("§5Void Veil activated!");
    }

    if (itemId === "arcane:gravity_maul") {
        for (const entity of nearbyEntities(player, ability.radius)) {
            entity.applyDamage(Math.round(ability.damage * power));
            try {
                entity.addEffect("slowness", 80, {
                    amplifier: 3,
                    showParticles: true
                });
            } catch {}
        }
        player.sendMessage("§8Gravity Slam unleashed!");
    }

    if (itemId === "arcane:lifebloom_staff") {
        player.addEffect("regeneration", 160, {
            amplifier: 2,
            showParticles: true
        });
        player.addEffect("absorption", 160, {
            amplifier: 0,
            showParticles: true
        });
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
        if (!consumeOne(player, item.typeId)) return;
        const restored = Math.min(65, maxMana(player) - mana(player));
        setMana(player, mana(player) + 65);
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

    if (Math.random() < 0.20) {
        try {
            dead.dimension.spawnItem(
                new ItemStack("arcane:arcane_essence", 1),
                dead.location
            );
        } catch {}
    }
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const current = mana(player);
        const maximum = maxMana(player);

        if (current < maximum) {
            setMana(player, current + 2);
        }

        const currentLevel = level(player);
        const currentXP = getNumber(player, "arcane:xp", 0);
        const barLength = 10;
        const filled = Math.min(
            barLength,
            Math.floor((currentXP / xpNeeded(currentLevel)) * barLength)
        );
        const bar = "§a" + "▰".repeat(filled) + "§8" + "▱".repeat(barLength - filled);

        player.onScreenDisplay.setActionBar(
            `§bMana ${mana(player)}/${maximum} §8| §6Lv.${currentLevel} §8| ${bar} §f${currentXP}/${xpNeeded(currentLevel)} XP`
        );
    }
}, 20);

console.warn("[Arcane Arsenal] Gameplay system loaded.");
