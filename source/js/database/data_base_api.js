// Перевод json файла в формат js объекта
let DataBase = require('../../assets/celestial_bodies_data.json');
DataBase = DataBase.solarSystem;
console.log(DataBase);

// Аппаратный интерфейс для взаимодействия с базой данных
export const DBAPI = {

    // Сохранение базы данных в виде пригодного для работы объекта
    DataBase: DataBase,

    // Поиск объекта по id
    FindObjectByID(targetID) {
        // если искомый id = 0 то возвращается солнце
        if (targetID == 0) return this.DataBase.sun;
        // если id - цифра, то поиск идет среди планет(дальше от солнца - больше id)
        else if (targetID < 10) {
            for (let planet of this.DataBase.planets) {
                if (planet.id == targetID) return planet;
            } // если id - двузначное число, то первая цифра - это id планеты, вторая цифра - id спутника этой планеты(дальше от планеты - больше id)
        } else if (targetID > 10) {
            // отделение id планеты от id спутника
            let stringifiedID = String(targetID);
            let planetID = stringifiedID[0];

            // поиск по планетам
            for (let planet of this.DataBase.planets) {
                if (planet.id == planetID) {
                    // когда планета найдена, поиск по ее спутникам
                    for (let i = 0; i < planet.moons.length; i++) {
                        if (planet.moons[i].id == targetID) return planet.moons[i];
                    }
                }
            }
        }
        // Если ничего не найдено(id передан ошибочный), возвращается null
        return null;
    },

    // Получение списка небесных тел в виде js объектов
    GetCelestialBodiesObjectList() {
        let celestialBodiesList = [];

        celestialBodiesList.push(this.DataBase.sun);

        for(let planet of this.DataBase.planets) {

            celestialBodiesList.push(planet);
            if(planet.moons.length != 0) {
                for(let satellite of planet.moons) {
                    celestialBodiesList.push(satellite);
                }
            }
        }

        return celestialBodiesList;
    }
}