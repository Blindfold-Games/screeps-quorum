'use strict'

const MetaRole = require('roles_meta')

class Filler extends MetaRole {
  constructor () {
    super()
    this.defaultEnergy = 1800
    this.fillableStructures = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TERMINAL]
  }

  getBuild (room, options) {
    this.setBuildDefaults(room, options)
    let build = [MOVE, CARRY, WORK]
    if (options.carry_only) {
      build = [MOVE, CARRY]
    }
    return Creep.buildFromTemplate(build, options.energy)
  }

  manageCreep (creep) {
    if (creep.ticksToLive < 50) {
      return creep.recycle()
    }
    if (creep.recharge()) {
      if (creep.memory.ft) {
        delete creep.memory.ft
      }
      return
    }

    // Check to see if creep is already assigned a valid target and reuse.
    if (creep.memory.ft) {
      const cachedStructure = Game.getObjectById(creep.memory.ft)
      if (cachedStructure && cachedStructure.energy < cachedStructure.energyCapacity) {
        this.fillStructure(creep, cachedStructure)
        return
      } else {
        delete creep.memory.ft
      }
    }

    // Find structure to fill
    const structure = creep.pos.findClosestByRange(creep.room.getStructuresToFill(this.fillableStructures)
    , {
      filter: (s) => {
 //       if (s.planned) {Logger.log('Already planned to fill ' + s.planned + ' to structure ' + s.id)}
        return (s.planned || 0) < s.store.getCapacity(RESOURCE_ENERGY);}
    }
    );
    if (structure) {
      (!structure.planned || structure.planned < structure.store.getCapacity(RESOURCE_ENERGY))
      creep.memory.ft = structure.id
      this.fillStructure(creep, structure)
      return
    }

    // If nothing else to fill, and structure is allowed, fill terminal.
    if (creep.room.isEconomyCapable('SUPPLY_TERMINAL')) {
      if (this.fillableStructures.includes(STRUCTURE_TERMINAL) && creep.room.terminal) {
        if (creep.room.terminal.store[RESOURCE_ENERGY] < TERMINAL_ENERGY) {
          this.fillStructure(creep, creep.room.terminal)
        }
      }
    }

    // Park
    let target
    if (creep.room.storage) {
      target = creep.room.storage
    } else {
      const spawns = creep.room.find(FIND_MY_SPAWNS)
      target = spawns[0]
    }
    if (creep.pos.getRangeTo(target) > 4) {
      creep.travelTo(target)
    }
  }

  fillStructure (creep, structure) {
    const energyToSupply = Math.min(creep.carry[RESOURCE_ENERGY], structure.energyCapacity - structure.energy);
    structure.planned = (structure.planned || 0) + energyToSupply
    if (creep.pos.isNearTo(structure)) {
      creep.transfer(structure, RESOURCE_ENERGY, energyToSupply)
    } else {
      const opts = {}
      if (structure.structureType === STRUCTURE_TOWER) {
        opts.ignoreCore = true
      }
      creep.travelTo(structure, opts)
    }
  }
}

module.exports = Filler
