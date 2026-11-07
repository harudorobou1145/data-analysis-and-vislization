def numerical_letter_grade(grades):
    """Convert GPAs to letter grades using the specified strict cutoffs.

    A GPA of exactly 4.0 receives A+, and exactly 0.0 receives E.
    """
    thresholds = [
        (3.7, "A"),
        (3.3, "A-"),
        (3.0, "B+"),
        (2.7, "B"),
        (2.3, "B-"),
        (2.0, "C+"),
        (1.7, "C"),
        (1.3, "C-"),
        (1.0, "D+"),
        (0.7, "D"),
        (0.0, "D-"),
    ]

    result = []
    for grade in grades:
        if grade == 4.0:
            result.append("A+")
        elif grade == 0.0:
            result.append("E")
        else:
            for cutoff, letter in thresholds:
                if grade > cutoff:
                    result.append(letter)
                    break
            else:
                # The table assigns E to 0.0; values below the stated GPA
                # range have no explicitly specified category.
                result.append("E")
    return result
