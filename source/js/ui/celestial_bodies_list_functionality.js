import {collapseableStructuresList} from './collapseable_elements';
import { SidePanel } from './side_panel';
import { celestialBodiesMeshesList } from '../model/celestial_bodies';

const CelestialBodiesList = {

    // Функционал связанный с навигацией по списку небесных тел.
    navigation: {
        // Получение списка кнопок, раскрывающих список спутников планет, по имени класса.
        expandButtonsList: document.getElementsByClassName("objects-list-panel__expand-list-icon"),

        // Изменение состояния списка спутников путем переключения у них класса 'expanded-objects-list' (см. _objects-list-panel.scss).
        ChangeSatellitesListState() {
            // Нужный ul находится через родительский для кнопки span. Т.к. ul идет сразу после него в структуре док-та используется селектор nextElementSibling.
            this.parentNode.nextElementSibling.classList.toggle('expanded-objects-list');
        },

        ExpandButtonsEventListenersAssignment() {
            // Итерация по массиву кнопок для присвоения каждой своего слушателя события (нажатия).
            for (let i = 0; i < this.expandButtonsList.length; i++) {
                this.expandButtonsList[i].addEventListener('click', this.ChangeSatellitesListState);
            }
        }
    },

    //Все, что нужно для передача информации в side_panel.js для изменения контента в боковой панели.
    contentChangeActivation: {
        // Список всех элементов-лейблов небесных тел. Складывается из списка планет и списка спутников.
        celestialBodiesNamesElementsList: [],

        // Функция, заполняющая список элементов-лейблов небесных тел.
        FillBodiesNamesElementsList() {
            let bodiesWithoutSatellitesArray = Array.prototype.slice.call(document.getElementsByClassName('objects-list-panel__object'), 0);
            let bodiesWithSatellitesArray = Array.prototype.slice.call(document.getElementsByClassName('objects-list-panel__expandable-group-header'), 0);
            let satellitesArray = Array.prototype.slice.call(document.getElementsByClassName('objects-list-panel__object-satellite'), 0);
            
            // Слияние всех 3 массивов.
            this.celestialBodiesNamesElementsList = (bodiesWithSatellitesArray.concat(bodiesWithoutSatellitesArray)).concat(satellitesArray);
        },

        // Добавление слушателей событий для каждого лейбла небесного тела.
        AssignEventListenersToCelestialBodiesLabelElems() {
            for(let i = 0; i < this.celestialBodiesNamesElementsList.length; i++) {
                
                // При клике на лейбл меняется контент на боковой панели и закрывается список планет
                this.celestialBodiesNamesElementsList[i].addEventListener('click', (e) => {

                    // Проверка target'а события нужна для предотвращения его всплытия т.к. кнопка раскрытия списка лежит внутри элемента-лейбла
                    // соответственно, всплытие провоцирует срабатывание события 'click' на самом лейбле, что вызывает функцию закрытия списка планет одновременно
                    // с функцией открытия списка спутников.
                    if (e.target.tagName != 'path' && e.target.tagName != 'svg') {
                        // Временное условие для ограничения функционала элементов списка, отвечающих за спутники
                        if ((e.target.closest("[id]")).getAttribute('id') < 10) {

                            let targetID = (e.target.closest("[id]")).getAttribute('id');
                            // Закрытие списка планет
                            collapseableStructuresList[0].ChangeCollapseableElementsState();
                            // Передача id небесного тела по пункту списка которого нажал пользователь на информационную панель
                            SidePanel.ChangeContent(targetID);
                            
                            // Передача id н.т. в модель
                            celestialBodiesMeshesList[targetID].ToggleFocusState(1);
                            // SidePanel.ChangeContent((e.target.closest("[id]")).getAttribute('id'));

                        }
                    }
                });
            }
        }

    },


    // Функция инициализации функционала всего объекта
    Init() {
        this.contentChangeActivation.FillBodiesNamesElementsList();
        this.navigation.ExpandButtonsEventListenersAssignment();
        this.contentChangeActivation.AssignEventListenersToCelestialBodiesLabelElems();
    }
    
}

CelestialBodiesList.Init();