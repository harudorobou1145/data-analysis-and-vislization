def hex_key(num):
    """Count hexadecimal digits whose numeric values are prime.

    The input is a valid hexadecimal string (possibly empty), with
    uppercase letters A through F.
    """
    return sum(digit in "2357BD" for digit in num)
