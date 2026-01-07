import { InferAttributes, Model, ModelStatic, Sequelize, WhereOptions } from 'sequelize'
import { checkDuplicates, eliminarRegistros, verifyIfExistRecord } from "./validation"
import { catByOrg, FileData, FinalResult, ORG_MAPPING, OrgResults } from '../types'

export async function processVersionUpdate<T extends Model>(
  currentVersionRecords: any[],
  model: ModelStatic<T>,
  altasData: any[],
  bajasData: any[],
  cambiosData: any[],
  keyField: string
) {
  const currentVersion = await getMaxVersion(model, 'VERSION')
  const newVersion = currentVersion + 1
  const finalRecords = eliminarRegistros(currentVersionRecords, bajasData, cambiosData)
  const newRecords = [...finalRecords, ...altasData]

  const transaction = await model.sequelize.transaction()
  try {
    // 1. Marcar bajas con nueva versión e INACTIVO
    if (bajasData.length > 0) {
      const serialesBajas = bajasData.map(item => item.SERIAL_DEC)
      await model.update(
        { ESTADO: 'INACTIVO', VERSION: newVersion },
        {
          where: {
            [keyField]: serialesBajas,
            ESTADO: 'ACTIVO',
            VERSION: currentVersion
          } as WhereOptions<InferAttributes<T>>,
          transaction
        }
      )
    }

    // 2. Insertar o actualizar cambios con nueva versión
    if (cambiosData.length > 0) {
      await Promise.all(
        cambiosData.map(item =>
          model.update(
            { ...item, VERSION: newVersion },
            {
              where: {
                [keyField]: item.SERIAL_DEC,
                VERSION: currentVersion
              },
              transaction
            }
          )
        )
      )
    }

    // 3. Insertar altas con nueva versión
    if (newRecords.length > 0) {
      await model.bulkCreate(
        newRecords.map(item => ({
          ...item,
          VERSION: newVersion
        })),
        { transaction }
      )
    }

    await transaction.commit()
    return { success: true }
  } catch (error) {
    await transaction.rollback()
    console.log(error)
    throw error
  }
}


export async function getMaxVersion(model, keyField) {
  try {
    const maxVersion = await model.max(keyField as string)
    return maxVersion || 0
  } catch (error) {
    throw new Error(`Error al consultar la version maxima en ${model.name}: `, error)
  }
}

export async function getInvalidRecords(model) {
  try {
    const allInvalidRecords = await model.findAll({
      where: {
        ESTADO: 'INACTIVO'
      },
      raw: true
    })
    return allInvalidRecords || 'No hay Registros'
  } catch (error) {
    throw new Error(`No se pudieron obtener los registros Inactivos de ${model.name}`)
  }
}

export async function getHighestVersionRecords(
  model,
  versionField,
  statusField?,
) {
  try {

    const tableExists = await model.sequelize?.getQueryInterface().tableExists(model.tableName)

    if (!tableExists) {
      await model.sync()
      return []
    }
    const maxVersion = await model.max(versionField as number)

    if (maxVersion === null || maxVersion === undefined) {
      return []
    }

    const result = await model.findAll({
      where: {
        [versionField]: maxVersion,
        [statusField]: 'ACTIVO'
      },
      raw: true
    })

    return result

  } catch (error) {
    console.error(`Error in getHighestVersion (table: ${model.tableName}):`, error)
    throw error
  }
}

export async function getAllVersions<T extends Model>(model: ModelStatic<T>,versionField: string): Promise<any[]> {
  const versions = await model.findAll({
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col(versionField)), versionField]
    ],
    order: [[versionField, 'DESC']],
    raw: true
  })
  return versions
}

export async function getAllRecordsBySelectedVersion<T extends Model>(
  model: ModelStatic<T>,
  version: number,
  versionField: string
): Promise<any[]> {
  const records = await model.findAll({
    where: {
      [versionField]: version
    } as any,
    raw: true
  })
  return records
}

export async function getStolenCards(model) {
  const tableExists = await model.sequelize?.getQueryInterface().tableExists(model.tableName)

  if (!tableExists) {
    await model.sync()
    return []
  }
  const stolenCards = await model.findAll({
    where: {
      estado: 'ACTIVO'
    },
    raw: true
  })
  return stolenCards
}

export async function getResumeOfValidationBL(
  altasData: any[],
  bajasData: any[],
  currentRecords: any[],
  invalidRecords: any[],
  stolenCards: any[],
  keyField: string
): Promise<FinalResult> {

  resetCatByOrg()

  const altasFiltered: any[] = []
  const bajasFiltered: any[] = []
  const altasFinal: any[] = []
  const bajasFinal: any[] = []
  const results: { [orgCode: string]: OrgResults }[] = []

  // Procesar archivos de altas
  processFiles(altasData, 'altas', altasFiltered)

  // Procesar archivos de bajas
  processFiles(bajasData, 'bajas', bajasFiltered)

  // Procesar validaciones por organización
  Object.entries(catByOrg).forEach(([orgCode, categorias]) => {
    const orgResults = processOrganizationValidation(
      orgCode as keyof typeof catByOrg,
      categorias,
      currentRecords,
      invalidRecords,
      stolenCards,
      keyField
    )

    results.push({ [orgCode]: orgResults })
  })
  results.forEach((orgObject) => {
    const [key, org] = Object.entries(orgObject)[0]

    if (org.altasValidas?.length) {
      altasFinal.push(...org.altasValidas)
    }

    if (org.bajasValidas?.length) {
      bajasFinal.push(...org.bajasValidas)
    }
  })

  return { altasFinal, bajasFinal, results }
}

// Función auxiliar para procesar archivos
function processFiles(files: FileData[], type: 'altas' | 'bajas', finalArray: any[]): void {
  files.forEach(file => {
    const orgCode = getOrgCodeFromFileName(file.fileName)
    if (orgCode && catByOrg[orgCode]) {
      catByOrg[orgCode][type].push(...file.validData)
    }
    finalArray.push(...file.validData)
  })
}

// Función para obtener el código de organización del nombre de archivo
function getOrgCodeFromFileName(fileName: string): keyof typeof catByOrg | null {
  for (const [code, orgCode] of Object.entries(ORG_MAPPING)) {
    if (fileName.includes(code)) {
      return orgCode
    }
  }
  return null
}

// Función para procesar validaciones de una organización
function processOrganizationValidation(
  orgCode: keyof typeof catByOrg,
  categorias: { altas: any[]; bajas: any[] },
  currentRecords: any[],
  invalidRecords: any[],
  stolenCards: any[],
  keyField: string
): OrgResults {
  //Procesar Altas
  // 
  const { datosValidos: altasPreValidas, datosDuplicados: altasDuplicadas } =
    checkDuplicates(currentRecords, categorias.altas, keyField)
  // 
  const { datosValidos: altasValidas, datosDuplicados: altasInactivas } =
    checkDuplicates(invalidRecords, altasPreValidas, keyField)

  const { datosValidos: bajasPreValidas, datosDuplicados: bajasInactivas } =
    checkDuplicates(invalidRecords, categorias.bajas, keyField)

  const { datosExistentes: bajasValidas, notFoundRecords: bajasSinRegistro } =
    verifyIfExistRecord(currentRecords, bajasPreValidas, keyField)

  // Si el proceso genera muchos rangos revertir por checkDuplicates a modo de retirar las bajas
  const { datosExistentes: bajasInStolen, notFoundRecords: bajasStolenValidas } =
    verifyIfExistRecord(stolenCards, bajasPreValidas, keyField)


  return {
    altasValidas,
    altasDuplicadas,
    altasInactivas,
    bajasValidas,
    bajasInactivas,
    bajasInStolen,
    bajasSinRegistro
  }
}

// Función para resetear el objeto catByOrg
function resetCatByOrg(): void {
  Object.keys(catByOrg).forEach(org => {
    catByOrg[org as keyof typeof catByOrg].altas = []
    catByOrg[org as keyof typeof catByOrg].bajas = []
  })
}
export async function getTotalRecords(model, versionField, statusField) {
  const maxVersion = await model.max(versionField as number)
  const total = await model.count({
    where: {
      [versionField]: maxVersion,
      [statusField]: 'ACTIVO'
    }
  })
  return total
}
export async function resumeBlackList(model) {
  const totalRecords = await getTotalRecords(model, 'version_ln', 'estado')
  const lastVersion = await getMaxVersion(model, 'version_ln')
  return { totalRecords, lastVersion }
}