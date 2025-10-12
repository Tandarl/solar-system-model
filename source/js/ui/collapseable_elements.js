class UICollapseableElement {
    constructor(StructureList) {
        /* 
            У некоторых элементов не нужно скрывать кнопку включения или отключения, например, вкладки в описании объекта,
            где блок заголовка целиком является кнопкой раскрытия вкладки и он должен оставаться видимым когда вкладка свернута.
        */
        this.hideOpenButton = StructureList[0][0]; // True / False
        this.hideCloseButton = StructureList[0][1]; // True / False

        /*
            Двумерный массив, в котором будут содержатся сами скрываемые/раскрываемые элементы из DOM дерева и их переключаемые классы 
            ( используется не только класс 'hidden', т.к. например вкладки в описании объекта не нужно полностью скрывать и у них переключается класс 'folded-chapter')
        */
        this.collapseableElementsList = [[]]; // Общий вид: [[<скрываемый html-элемент>, <его переключаемый класс>], [<скрываемый html-элемент>, <его переключаемый класс>]]

        /* 
            Заполнение массива, объявленного сверху. Перебор StructureList начинается с 1 т.к на 0-ом индексе находится массив с правилом для скрытия/ не скрытия кнопок
            включения/выключения структур элементов.

        */
           for(let k=1; k < StructureList.length; k++) {
                this.collapseableElementsList[k-1] = [];
                this.collapseableElementsList[k-1][0] = document.getElementById(StructureList[k][0]);
                // Если в StructureList на месте переключаемого класса указан 0, то для этого элемента ставится значение по умолчанию - hidden.
                StructureList[k][1] ?  this.collapseableElementsList[k-1][1] = StructureList[k][1] : this.collapseableElementsList[k-1][1] = 'hidden';
        }

        // Поиск и привязка слушателей событий на кнопки скрытия/показа структуры элементов
        this.openButton = document.getElementById(`${StructureList[1][0]}__expand-button`);
        this.openButton.addEventListener('click', this.ChangeCollapseableElementsState.bind(this))

        this.closeButton = document.getElementById(`${StructureList[1][0]}__collapse-button`);
        this.closeButton.addEventListener('click', this.ChangeCollapseableElementsState.bind(this));
    }

    /* Метод переключения состояния кнопок скрытия/показа (если нужно) и переключения соответствующих классов у скрываемых элементов */
    ChangeCollapseableElementsState() {
        if(this.hideOpenButton) this.openButton.classList.toggle('hidden');
        if(this.hideCloseButton) this.closeButton.classList.toggle('hidden');

        for(let i=0; i < this.collapseableElementsList.length; i++) {
            this.collapseableElementsList[i][0].classList.toggle(this.collapseableElementsList[i][1]);
        }
    }
}

/*
Массив всех скрываемых структур (совокупностей html элементов)
        ОБЩИЙ ВИД:

                  |                                    |                                  | id этого эл-та определяет  | если 0, то       | прочий эл-т
                  V 1 или 0                            V 1 или 0                          V id вкл/выкл кнопок         V hidden           V связанный с основным
    [ [<скрытие кнопки включения элемента>, <скрытие кнопки выключения элемента>], [<основной элемент>, <переключаемый класс>], [<прочий элемент>, <переключаемый класс>]]
*/
const AffectedByExpandingElementsConfigurationList = [
    [[0, 1],['objects-list-panel', 0]],
    [[1, 1], ['side-panel', 0]], 
    [[0, 1], ['side-panel__object-description', 'folded-chapter'], ['side-panel__object-description-paragraph', 0], ['folded-description-chapter-plus-sign', 0]],
    [[0, 1], ['side-panel__object-features', 'folded-chapter'], ['side-panel__object-features-groups-list', 0], ['folded-features-chapter-plus-sign', 0]]
];

let collapseableStructuresList = [];

for(let i=0; i < AffectedByExpandingElementsConfigurationList.length; i++) {
    collapseableStructuresList[i] = new UICollapseableElement(AffectedByExpandingElementsConfigurationList[i]);
}


export {collapseableStructuresList}