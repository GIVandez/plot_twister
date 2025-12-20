from typing import Optional, Dict
from database.repository import DatabaseRepository


class PageModel:
    def __init__(self):
        self.db = DatabaseRepository()
    
    def new_page(self, project_id: int, number: Optional[int] = None, text: Optional[str] = None) -> bool:
        """
        Создание новой страницы сценария
        
        Args:
            project_id: id проекта
            number: порядковый номер страницы в сценарии
            text: текстовое содержимое страницы
        
        Returns:
            success: bool - успешность операции
        """
        return self.db.create_page(project_id, number=number, text=text)
    
    def get_page(self, page_id: int) -> Optional[Dict]:
        """
        Получение информации о странице
        
        Args:
            page_id: id страницы
        
        Returns:
            page_info: словарь с информацией о странице
        """
        return self.db.read_page_info(page_id)
    
    def edit_page(self, page_id: int, new_page_data: Dict) -> bool:
        """
        Редактирование информации о странице
        
        Args:
            page_id: id редактируемой страницы
            new_page_data: словарь с информацией о странице {text: str, number: int}
        
        Returns:
            success: bool - успешность операции
        """
        text = new_page_data.get('text')
        page_number = new_page_data.get('number')
        
        success = True
        
        # Обновляем текст страницы, если передан
        if text is not None:
            success = self.db.update_page_text(page_id, text) and success
        
        # Обновляем номер страницы, если передан
        if page_number is not None:
            success = self.db.update_page_number(page_id, page_number) and success
        
        return success
    
    def delete_page(self, page_id: int) -> bool:
        """
        Удаление страницы сценария
        
        Args:
            page_id: id страницы
        
        Returns:
            success: bool - успешность операции
        """
        return self.db.delete_page(page_id)