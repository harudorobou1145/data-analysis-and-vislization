def odd_count(lst):
    """Return one sentence per digit string, with each ``i`` replaced by
    the number of odd digits in that string.

    >>> odd_count(['1234567'])
    ["the number of odd elements 4n the str4ng 4 of the 4nput."]
    >>> odd_count(['3', "11111111"])
    ["the number of odd elements 1n the str1ng 1 of the 1nput.",
     "the number of odd elements 8n the str8ng 8 of the 8nput."]
    """
    template = "the number of odd elements in the string i of the input."
    result = []
    for digits in lst:
        odd_digits = sum(1 for digit in digits if int(digit) % 2 == 1)
        result.append(template.replace("i", str(odd_digits)))
    return result
