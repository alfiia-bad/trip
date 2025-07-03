from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

def get_google_currency_rate(from_currency: str, to_currency: str) -> float | None:
    # Формируем поисковый запрос
    query = f"1 {from_currency} в {to_currency}"
    url = f"https://www.google.com/search?q={query}"

    # Настраиваем headless режим браузера
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)  # укажи путь chromedriver, если нужно: executable_path='path_to_driver'
    driver.get(url)

    # Ждем загрузки страницы (можно улучшить через WebDriverWait)
    time.sleep(3)

    try:
        # Ищем элемент с курсом (Google обычно показывает его в элементе с data-attrid="currency_converter_result")
        element = driver.find_element(By.CSS_SELECTOR, '[data-attrid="currency_converter_result"] span[jsname="vWLAgc"]')
        rate_text = element.text  # например "29,07"
        
        # Заменяем запятую на точку и преобразуем в число
        rate = float(rate_text.replace(",", "."))
        return rate
    except Exception as e:
        print("Ошибка при получении курса:", e)
        return None
    finally:
        driver.quit()

if __name__ == "__main__":
    rate = get_google_currency_rate("лари", "рублях")
    if rate is not None:
        print(f"Курс 1 лари в рублях по Google: {rate}")
    else:
        print("Не удалось получить курс")
