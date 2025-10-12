import { DBAPI } from "../database/data_base_api";
// Импорт аппаратного интерфейса базы данных для получения из нее информации о небесных телах

export const SidePanel = {
    sidePanelContentElemsIDs: ['side-panel__object-name', 'side-panel__object-type', 'side-panel__object-description-paragraph', 'side-panel__celestial-body-features-list', 'side-panel__orbit-features-list'],
    sidePanelContentElems: {
        name: 0,
        type: 0,
        description: 0,
        body_parameters: 0,
        orbit_parameters: 0
    },
    
    // Заполнение списка html-элементов (объявлен выше), в которых нужно менять контент
    FillSPContentElemsList() {
        let counter = 0;
        for (let key in this.sidePanelContentElems) {
            this.sidePanelContentElems[key] = document.getElementById(this.sidePanelContentElemsIDs[counter]);
            counter++;
        }
    },


    ChangeContent(bodyID) {
        // Получение объекта с данными о небесном теле из БД
        let obj = DBAPI.FindObjectByID(bodyID);
        // Итерация по всем изменяемым элементам, чтобы заменить в них контент
        for(let key in this.sidePanelContentElems) {
            if( typeof obj[key] != "object") {
                // Если свойство объекта не является объектом(т.е. списком характеристик), то меняется текст в соответствующем элементе (название, тип или описание)
                this.sidePanelContentElems[key].textContent = obj[key];
            } else {
                // Изменение списка характеристик
                // Очистка списка
                this.sidePanelContentElems[key].innerHTML = '';
                // Создание нового заголовка группы характеристик
                let featuresGroupHeader = document.createElement('h4');
                featuresGroupHeader.classList.add('side-panel__object-features-group-header');

                // Запись имени группы характеристик в зависимости от того, на каком свойстве объекта сейчас находится итератор
                key == 'body_parameters' ? featuresGroupHeader.innerText = 'Физические характеристики' : featuresGroupHeader.innerText = 'Характеристики орбиты';
                // Добавление заголовка внутрь списка характеристик
                this.sidePanelContentElems[key].appendChild(featuresGroupHeader);

                // Для каждого параметра создается html разметка и заполняется нужными значениями. Затем она добавляется внутрь ul характеристик
                let featureElem;
                for(let feature in obj[key]) {
                    featureElem = `<li class="side-panel__object-feature">
                                        <span class="side-panel__object-feature-name">${feature}:</span>
                                        <span class="side-panel__object-feature-value">${obj[key][feature]}</span>
                                    </li>`;
                    this.sidePanelContentElems[key].insertAdjacentHTML('beforeend', featureElem);
                }
            }
        }
    },


    // Функция инициализации запускается единожды при загрузке страницы
    Init() {
        this.FillSPContentElemsList();
        this.ChangeContent(0);
    }
}

SidePanel.Init();
