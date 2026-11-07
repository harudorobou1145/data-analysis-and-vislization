def hex_key(num):
    """Count hexadecimal digits whose decimal values are prime.

    The prime-value hexadecimal digits are 2, 3, 5, 7, B (11), and D (13).
    """
    return sum(digit in "2357BD" for digit in num)
