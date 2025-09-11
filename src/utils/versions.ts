import { InferAttributes, Model, ModelStatic, Sequelize, WhereOptions } from 'sequelize'
import { checkDuplicates, eliminarRegistros } from "./validation"
import { catByOrg, FileData, FinalResult, ORG_MAPPING, OrgResults } from '../types'

export async function processVersionUpdate<T extends Model>(
  currentVersionRecords: any[],
  model: ModelStatic<T>,
  altasData: any[],
  bajasData: any[],
  cambiosData: any[],
  keyField: string
) {
  const currentVersion = await getMaxVersion(model)
  const newVersion = currentVersion + 1
  const finalRecords = eliminarRegistros(currentVersionRecords, bajasData, cambiosData)
  const newRecords = [...finalRecords, ...altasData]

  const transaction = await model.sequelize.transaction()
  try {
    // 1. Marcar bajas con nueva versión e INACTIVO
    if (bajasData.length > 0) {
      await model.bulkCreate(
        bajasData.map(item => ({
          ...item,
          ESTADO: 'INACTIVO',
          VERSION: newVersion
        })),
        { transaction }
      )
    }

    // 2. Insertar o actualizar cambios con nueva versión
    if (cambiosData.length > 0) {
      await Promise.all(
        cambiosData.map(item =>
          model.upsert(
            { ...item, VERSION: newVersion },
            {
              transaction,
              conflictFields: [keyField] // Campo único para determinar si existe
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


export async function getMaxVersion(model) {
  try {
    const maxVersion = await model.max('VERSION' as string)
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

export async function getHighestVersionRecords<T extends Model>(
  model: ModelStatic<T>,
  versionField: keyof InferAttributes<T> = 'VERSION' as keyof InferAttributes<T>,
  statusField: keyof InferAttributes<T> = 'ESTADO' as keyof InferAttributes<T>,
): Promise<any[]> {
  try {

    const tableExists = await model.sequelize?.getQueryInterface().tableExists(model.tableName)

    if (!tableExists) {
      await model.sync()
      return []
    }
    const maxVersion = await model.max(versionField as string)

    if (maxVersion === null || maxVersion === undefined) {
      return []
    }

    const result = await model.findAll({
      where: {
        [versionField]: maxVersion,
        [statusField]: 'ACTIVO'
      } as WhereOptions<InferAttributes<T>>,
      raw: true
    })

    return result

  } catch (error) {
    console.error(`Error in getHighestVersion (table: ${model.tableName}):`, error)
    throw error
  }
}

export async function getAllVersions<T extends Model>(model: ModelStatic<T>) {
  const versions = await model.findAll({
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col('VERSION')), 'VERSION']
    ],
    order: [['VERSION', 'DESC']],
    raw: true
  })
  return versions
}

export async function getAllRecordsBySelectedVersion<T extends Model>(
  model: ModelStatic<T>,
  version: number
): Promise<any[]> {
  const records = await model.findAll({
    where: {
      VERSION: version
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
  // Limpiar el objeto catByOrg antes de empezar
  resetCatByOrg()

  const altasFinal: any[] = []
  const bajasFinal: any[] = []
  const results: { [orgCode: string]: OrgResults }[] = []

  // Procesar archivos de altas
  processFiles(altasData, 'altas', altasFinal)

  // Procesar archivos de bajas
  processFiles(bajasData, 'bajas', bajasFinal)

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
    console.log(orgCode)
    results.push({ [orgCode]: orgResults })
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
  const { datosValidos: altasValidas, datosDuplicados: altasDuplicadas } =
    checkDuplicates(currentRecords, categorias.altas, keyField)

  const { datosValidos: bajasPreValidas, datosDuplicados: bajasInactivas } =
    checkDuplicates(invalidRecords, categorias.bajas, keyField)

  const { datosValidos: bajasValidas, datosDuplicados: bajasInStolen } =
    checkDuplicates(stolenCards, bajasPreValidas, keyField)

  return {
    altasValidas,
    altasDuplicadas,
    bajasValidas,
    bajasInactivas,
    bajasInStolen
  }
}

// Función para resetear el objeto catByOrg
function resetCatByOrg(): void {
  Object.keys(catByOrg).forEach(org => {
    catByOrg[org as keyof typeof catByOrg].altas = []
    catByOrg[org as keyof typeof catByOrg].bajas = []
  })
}