from decimal import Decimal


def compare_one(a, b):
    """
    Create a function that takes integers, floats, or strings representing
    real numbers, and returns the larger variable in its given variable type.
    Return None if the values are equal.
    Note: If a real number is represented as a string, the floating point might be . or ,

    compare_one(1, 2.5) ➞ 2.5
    compare_one(1, "2,3") ➞ "2,3"
    compare_one("5,1", "6") ➞ "6"
    compare_one("1", 1) ➞ None
    """
    def as_decimal(value):
        if isinstance(value, bool):
            return Decimal(int(value))
        if isinstance(value, str):
            value = value.strip().replace(",", ".")
        return Decimal(str(value))

    a_number = as_decimal(a)
    b_number = as_decimal(b)

    if a_number == b_number:
        return None
    return a if a_number > b_number else b
