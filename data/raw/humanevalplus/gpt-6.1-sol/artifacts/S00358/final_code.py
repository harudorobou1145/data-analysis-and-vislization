def valid_date(date):
    """You have to write a function which validates a given date string and
    returns True if the date is valid otherwise False.
    The date is valid if all of the following rules are satisfied:
    1. The date string is not empty.
    2. The number of days is not less than 1 or higher than 31 days for months 1,3,5,7,8,10,12. And the number of days is not less than 1 or higher than 30 days for months 4,6,9,11. And, the number of days is not less than 1 or higher than 29 for the month 2.
    3. The months should not be less than 1 or higher than 12.
    4. The date should be in the format: mm-dd-yyyy

    for example:
    valid_date('03-11-2000') => True

    valid_date('15-01-2012') => False

    valid_date('04-0-2040') => False

    valid_date('06-04-2020') => True

    valid_date('06/04/2020') => False
    """
    if not isinstance(date, str):
        return False

    parts = date.split("-")
    if tuple(len(part) for part in parts) != (2, 2, 4):
        return False
    if not all(part.isascii() and part.isdigit() for part in parts):
        return False

    month = int(parts[0])
    day = int(parts[1])
    if not 1 <= month <= 12:
        return False

    month_lengths = (31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    return 1 <= day <= month_lengths[month - 1]
