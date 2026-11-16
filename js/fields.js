// Generated from the field registry in Puffco Connect 3.13.47 (tables
// loraxPikachoid / loraxToad). type = wire codec; div = int32 scale divisor;
// rw = readable/writable per the app; enum = value labels.
// pikachoid = Peak Pro family (apiSeries 0), toad = Proxy (apiSeries 1).
export const FIELDS = {
 "pikachoid": {
  "userHeaterTemp": {
   "path": "/p/app/htr/temp",
   "type": "float32",
   "rw": "r"
  },
  "userHeaterTempCommand": {
   "path": "/p/app/htr/tcmd",
   "type": "float32",
   "rw": "r"
  },
  "heaterTemp": {
   "path": "/p/htr/temp",
   "type": "float32",
   "rw": "r"
  },
  "operatingState": {
   "path": "/p/app/stat/id",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "InitMemory",
    "1": "InitVersion",
    "2": "InitBattery",
    "3": "MasterOff",
    "4": "Sleep",
    "5": "Idle",
    "6": "TempSelect",
    "7": "HeatCyclePreheat",
    "8": "HeatCycleActive",
    "9": "HeatCycleFade",
    "10": "Version",
    "11": "BattLevel",
    "12": "FactoryTest",
    "13": "Bonding"
   }
  },
  "stateElapsedTime": {
   "path": "/p/app/stat/elap",
   "type": "float32",
   "rw": "r"
  },
  "stateTotalTime": {
   "path": "/p/app/stat/tott",
   "type": "float32",
   "rw": "r"
  },
  "battSoc": {
   "path": "/p/bat/soc",
   "type": "float32",
   "rw": "r"
  },
  "battChargeState": {
   "path": "/p/bat/chg/stat",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "Bulk",
    "1": "Topup",
    "2": "Full",
    "3": "TempStop",
    "4": "Done/Disconnected"
   }
  },
  "battChargeSource": {
   "path": "/p/bat/chg/src",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "USB",
    "1": "Generic Qi",
    "2": "Power Dock",
    "3": "None"
   }
  },
  "battChargeEstTimeToFull": {
   "path": "/p/bat/chg/etf",
   "type": "float32",
   "rw": "r"
  },
  "battVolts": {
   "path": "/p/bat/volt",
   "type": "float32",
   "rw": "r"
  },
  "battTemp": {
   "path": "/p/bat/temp",
   "type": "float32",
   "rw": "r"
  },
  "batteryCapacity": {
   "path": "/p/bat/cap",
   "type": "float32",
   "rw": "r"
  },
  "selectedHeatCycle": {
   "path": "/p/app/hcs",
   "type": "int8",
   "rw": "rw",
   "enum": {
    "-1": "Temp",
    "0": "1",
    "1": "2",
    "2": "3",
    "3": "4"
   }
  },
  "modeCmd": {
   "path": "/p/app/mc",
   "type": "uint8",
   "rw": "w",
   "enum": {
    "0": "MasterOff",
    "1": "Sleep",
    "2": "Idle",
    "3": "TempSelectBegin",
    "4": "TempSelectStep",
    "5": "ShowBattLevel",
    "6": "ShowVersion",
    "7": "HeatCycleStart",
    "8": "HeatCycleAbort",
    "9": "HeatCycleBoost",
    "10": "FactoryTest",
    "11": "Bonding"
   }
  },
  "tempOverride": {
   "path": "/p/app/tmpo",
   "type": "float32",
   "rw": "rw"
  },
  "timeOverride": {
   "path": "/p/app/timo",
   "type": "float32",
   "rw": "rw"
  },
  "heaterType": {
   "path": "/p/htr/chmt",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "None",
    "1": "Classic",
    "2": "XL",
    "3": "3D",
    "4": "Toad"
   }
  },
  "approxDabsRemaining": {
   "path": "/p/app/info/drem",
   "type": "float32",
   "rw": "r"
  },
  "dabsPerDay": {
   "path": "/p/app/info/dpd",
   "type": "float32",
   "rw": "r"
  },
  "totalHeatCycles": {
   "path": "/p/app/odom/0/nc",
   "type": "float32",
   "rw": "r"
  },
  "totalHeatCycleTime": {
   "path": "/p/app/odom/0/tm",
   "type": "float32",
   "rw": "r"
  },
  "tripHeatCycles": {
   "path": "/p/app/odom/1/nc",
   "type": "float32",
   "rw": "rw"
  },
  "numHeatCycles": {
   "path": "/p/app/nhc",
   "type": "uint32",
   "rw": "r"
  },
  "serialNumber": {
   "path": "/p/sys/hw/ser",
   "type": "string",
   "rw": "r"
  },
  "gitHash": {
   "path": "/p/sys/fw/gith",
   "type": "string",
   "rw": "r"
  },
  "modelCode": {
   "path": "/p/sys/hw/mdcd",
   "type": "uint32",
   "rw": "r"
  },
  "hardwareRevision": {
   "path": "/p/sys/hw/ver",
   "type": "uint32",
   "rw": "r"
  },
  "swOtaVersion": {
   "path": "/p/sys/fw/ver",
   "type": "uint32",
   "rw": "r"
  },
  "apiVersion": {
   "path": "/p/sys/fw/api",
   "type": "uint32",
   "rw": "r"
  },
  "euid": {
   "path": "/p/sys/bt/mac",
   "type": "uint8Array",
   "rw": "r"
  },
  "deviceName": {
   "path": "/u/sys/name",
   "type": "string",
   "rw": "rw"
  },
  "deviceBirthday": {
   "path": "/u/sys/bday",
   "type": "uint32",
   "rw": "rw"
  },
  "uptime": {
   "path": "/p/sys/uptm",
   "type": "float32",
   "rw": "r"
  },
  "stealthMode": {
   "path": "/u/app/ui/stlm",
   "type": "uint8",
   "rw": "rw",
   "enum": {
    "0": "Off",
    "1": "On"
   }
  },
  "ledBrightness": {
   "path": "/u/app/ui/lbrt",
   "type": "uint8Array",
   "rw": "rw"
  },
  "readyModeCycle": {
   "path": "/u/app/rdym/hc",
   "type": "float32",
   "rw": "rw",
   "enum": {
    "-1": "Disable",
    "0": "1",
    "1": "2",
    "2": "3",
    "3": "4"
   }
  },
  "lanternStart": {
   "path": "/p/app/ltrn/cmd",
   "type": "uint8",
   "rw": "w"
  },
  "lanternTime": {
   "path": "/p/app/ltrn/time",
   "type": "float32",
   "rw": "rw"
  },
  "lanternRemainingTime": {
   "path": "/p/app/ltrn/remt",
   "type": "float32",
   "rw": "r"
  },
  "lanternColorApi2": {
   "path": "/p/app/ltrn/colr",
   "type": "rgbtApi2",
   "rw": "rw"
  },
  "maxBattSoc": {
   "path": "/u/bat/msoc",
   "type": "float32",
   "rw": "rw"
  },
  "lowBattWarnSoc": {
   "path": "/u/app/lbws",
   "type": "float32",
   "rw": "rw"
  },
  "utcTime": {
   "path": "/p/sys/time",
   "type": "uint32",
   "rw": "rw"
  },
  "heatCycle0Name": {
   "path": "/u/app/hc/0/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle0Temp": {
   "path": "/u/app/hc/0/temp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle0Time": {
   "path": "/u/app/hc/0/time",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle0ColorApi2": {
   "path": "/u/app/hc/0/colr",
   "type": "rgbtApi2",
   "rw": "rw"
  },
  "heatCycle0BoostTempDelta": {
   "path": "/u/app/hc/0/btmp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle0BoostTimeDelta": {
   "path": "/u/app/hc/0/btim",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle0Intensity": {
   "path": "/u/app/hc/0/intn",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle1Name": {
   "path": "/u/app/hc/1/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle1Temp": {
   "path": "/u/app/hc/1/temp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle1Time": {
   "path": "/u/app/hc/1/time",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle1ColorApi2": {
   "path": "/u/app/hc/1/colr",
   "type": "rgbtApi2",
   "rw": "rw"
  },
  "heatCycle1BoostTempDelta": {
   "path": "/u/app/hc/1/btmp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle1BoostTimeDelta": {
   "path": "/u/app/hc/1/btim",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle1Intensity": {
   "path": "/u/app/hc/1/intn",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle2Name": {
   "path": "/u/app/hc/2/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle2Temp": {
   "path": "/u/app/hc/2/temp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle2Time": {
   "path": "/u/app/hc/2/time",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle2ColorApi2": {
   "path": "/u/app/hc/2/colr",
   "type": "rgbtApi2",
   "rw": "rw"
  },
  "heatCycle2BoostTempDelta": {
   "path": "/u/app/hc/2/btmp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle2BoostTimeDelta": {
   "path": "/u/app/hc/2/btim",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle2Intensity": {
   "path": "/u/app/hc/2/intn",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle3Name": {
   "path": "/u/app/hc/3/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle3Temp": {
   "path": "/u/app/hc/3/temp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle3Time": {
   "path": "/u/app/hc/3/time",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle3ColorApi2": {
   "path": "/u/app/hc/3/colr",
   "type": "rgbtApi2",
   "rw": "rw"
  },
  "heatCycle3BoostTempDelta": {
   "path": "/u/app/hc/3/btmp",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle3BoostTimeDelta": {
   "path": "/u/app/hc/3/btim",
   "type": "float32",
   "rw": "rw"
  },
  "heatCycle3Intensity": {
   "path": "/u/app/hc/3/intn",
   "type": "float32",
   "rw": "rw"
  }
 },
 "toad": {
  "userHeaterTemp": {
   "path": "/p/app/htr/temp",
   "type": "int32",
   "div": 10,
   "rw": "r"
  },
  "userHeaterTempCommand": {
   "path": "/p/app/htr/tcmd",
   "type": "int32",
   "div": 10,
   "rw": "r"
  },
  "operatingState": {
   "path": "/p/app/stat/id",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "InitMemory",
    "1": "InitVersion",
    "2": "InitBattery",
    "3": "MasterOff",
    "4": "Sleep",
    "5": "Idle",
    "6": "TempSelect",
    "7": "HeatCyclePreheat",
    "8": "HeatCycleActive",
    "9": "Version",
    "10": "BattLevel",
    "11": "FactoryTest",
    "12": "Bonding"
   }
  },
  "stateElapsedTime": {
   "path": "/p/app/stat/elap",
   "type": "int32",
   "div": 200,
   "rw": "r"
  },
  "stateTotalTime": {
   "path": "/p/app/stat/tott",
   "type": "int32",
   "div": 200,
   "rw": "r"
  },
  "battSoc": {
   "path": "/p/bat/soc",
   "type": "int32",
   "div": 100,
   "rw": "r"
  },
  "battChargeState": {
   "path": "/p/bat/chg/stat",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "Bulk",
    "1": "Topup",
    "2": "Full",
    "3": "TempStop",
    "4": "Done/Disconnected"
   }
  },
  "battChargeEstTimeToFull": {
   "path": "/p/bat/chg/etf",
   "type": "int32",
   "div": 200,
   "rw": "r"
  },
  "battVolts": {
   "path": "/p/bat/volt",
   "type": "int32",
   "div": 1000,
   "rw": "r"
  },
  "battTemp": {
   "path": "/p/bat/temp",
   "type": "int32",
   "div": 10,
   "rw": "r"
  },
  "batteryCapacity": {
   "path": "/p/bat/cap",
   "type": "int32",
   "div": 1000,
   "rw": "r"
  },
  "selectedHeatCycle": {
   "path": "/p/app/hcs",
   "type": "int8",
   "rw": "rw",
   "enum": {
    "-1": "Temp",
    "0": "1",
    "1": "2",
    "2": "3",
    "3": "4"
   }
  },
  "modeCmd": {
   "path": "/p/app/mc",
   "type": "uint8",
   "rw": "w",
   "enum": {
    "0": "MasterOff",
    "1": "Sleep",
    "2": "Idle",
    "3": "TempSelectBegin",
    "4": "TempSelectStep",
    "5": "ShowBattLevel",
    "6": "ShowVersion",
    "7": "HeatCycleStart",
    "8": "HeatCycleAbort",
    "9": "HeatCycleBoost",
    "10": "FactoryTest",
    "11": "Bonding"
   }
  },
  "tempOverride": {
   "path": "/p/app/tmpo",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "timeOverride": {
   "path": "/p/app/timo",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heaterType": {
   "path": "/p/htr/chmt",
   "type": "uint8",
   "rw": "r",
   "enum": {
    "0": "None",
    "1": "Classic",
    "2": "XL",
    "3": "3D",
    "4": "Toad"
   }
  },
  "approxDabsRemaining": {
   "path": "/p/app/info/drem",
   "type": "int32",
   "div": 256,
   "rw": "r"
  },
  "dabsPerDay": {
   "path": "/p/app/info/dpd",
   "type": "int32",
   "div": 256,
   "rw": "r"
  },
  "totalHeatCycles": {
   "path": "/p/app/odom/0/nc",
   "type": "uint32",
   "rw": "r"
  },
  "totalHeatCycleTime": {
   "path": "/p/app/odom/0/tm",
   "type": "uint32",
   "rw": "r"
  },
  "tripHeatCycles": {
   "path": "/p/app/odom/1/nc",
   "type": "uint32",
   "rw": "rw"
  },
  "numHeatCycles": {
   "path": "/p/app/nhc",
   "type": "uint32",
   "rw": "r"
  },
  "serialNumber": {
   "path": "/p/sys/hw/ser",
   "type": "string",
   "rw": "r"
  },
  "gitHash": {
   "path": "/p/sys/fw/gith",
   "type": "string",
   "rw": "r"
  },
  "modelCode": {
   "path": "/p/sys/hw/mdcd",
   "type": "uint32",
   "rw": "r"
  },
  "hardwareRevision": {
   "path": "/p/sys/hw/ver",
   "type": "uint32",
   "rw": "r"
  },
  "swOtaVersion": {
   "path": "/p/sys/fw/ver",
   "type": "uint32",
   "rw": "r"
  },
  "apiVersion": {
   "path": "/p/sys/fw/api",
   "type": "uint32",
   "rw": "r"
  },
  "euid": {
   "path": "/p/sys/bt/mac",
   "type": "uint8Array",
   "rw": "r"
  },
  "deviceName": {
   "path": "/u/sys/name",
   "type": "string",
   "rw": "rw"
  },
  "deviceBirthday": {
   "path": "/u/sys/bday",
   "type": "uint32",
   "rw": "rw"
  },
  "uptime": {
   "path": "/p/sys/uptm",
   "type": "uint32",
   "rw": "r"
  },
  "stealthMode": {
   "path": "/u/app/ui/stlm",
   "type": "uint8",
   "rw": "rw",
   "enum": {
    "0": "Off",
    "1": "On"
   }
  },
  "lanternStart": {
   "path": "/p/app/ltrn/cmd",
   "type": "uint8",
   "rw": "w"
  },
  "lanternTime": {
   "path": "/p/app/ltrn/time",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "lanternRemainingTime": {
   "path": "/p/app/ltrn/remt",
   "type": "int32",
   "div": 200,
   "rw": "r"
  },
  "maxBattSoc": {
   "path": "/u/bat/msoc",
   "type": "int32",
   "div": 100,
   "rw": "rw"
  },
  "lowBattWarnSoc": {
   "path": "/u/app/lbws",
   "type": "int32",
   "div": 100,
   "rw": "rw"
  },
  "utcTime": {
   "path": "/p/sys/time",
   "type": "uint32",
   "rw": "rw"
  },
  "heatCycle0Name": {
   "path": "/u/app/hc/0/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle0Temp": {
   "path": "/u/app/hc/0/temp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle0Time": {
   "path": "/u/app/hc/0/time",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle0BoostTempDelta": {
   "path": "/u/app/hc/0/btmp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle0BoostTimeDelta": {
   "path": "/u/app/hc/0/btim",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle0Intensity": {
   "path": "/u/app/hc/0/intn",
   "type": "int32",
   "div": 256,
   "rw": "rw"
  },
  "heatCycle1Name": {
   "path": "/u/app/hc/1/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle1Temp": {
   "path": "/u/app/hc/1/temp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle1Time": {
   "path": "/u/app/hc/1/time",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle1BoostTempDelta": {
   "path": "/u/app/hc/1/btmp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle1BoostTimeDelta": {
   "path": "/u/app/hc/1/btim",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle1Intensity": {
   "path": "/u/app/hc/1/intn",
   "type": "int32",
   "div": 256,
   "rw": "rw"
  },
  "heatCycle2Name": {
   "path": "/u/app/hc/2/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle2Temp": {
   "path": "/u/app/hc/2/temp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle2Time": {
   "path": "/u/app/hc/2/time",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle2BoostTempDelta": {
   "path": "/u/app/hc/2/btmp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle2BoostTimeDelta": {
   "path": "/u/app/hc/2/btim",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle2Intensity": {
   "path": "/u/app/hc/2/intn",
   "type": "int32",
   "div": 256,
   "rw": "rw"
  },
  "heatCycle3Name": {
   "path": "/u/app/hc/3/name",
   "type": "string",
   "rw": "rw"
  },
  "heatCycle3Temp": {
   "path": "/u/app/hc/3/temp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle3Time": {
   "path": "/u/app/hc/3/time",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle3BoostTempDelta": {
   "path": "/u/app/hc/3/btmp",
   "type": "int32",
   "div": 10,
   "rw": "rw"
  },
  "heatCycle3BoostTimeDelta": {
   "path": "/u/app/hc/3/btim",
   "type": "int32",
   "div": 200,
   "rw": "rw"
  },
  "heatCycle3Intensity": {
   "path": "/u/app/hc/3/intn",
   "type": "int32",
   "div": 256,
   "rw": "rw"
  }
 }
};
