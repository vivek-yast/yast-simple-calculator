"use client";

import { useCallback, useEffect, useState } from "react";
import { Delete, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Operator = "add" | "subtract" | "multiply" | "divide";

const operatorSymbols: Record<Operator, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

function calculate(left: number, right: number, operator: Operator) {
  if (operator === "add") return left + right;
  if (operator === "subtract") return left - right;
  if (operator === "multiply") return left * right;
  if (right === 0) return Number.NaN;
  return left / right;
}

function formatResult(value: number) {
  if (!Number.isFinite(value)) return "Error";
  if (Object.is(value, -0)) return "0";

  const rounded = Number(value.toPrecision(12));
  return rounded.toString();
}

const numberKeys = [
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
];

function celebrate(origin = { x: 0.5, y: 0.75 }) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  void import("canvas-confetti").then(({ default: confetti }) => {
    void confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 42,
      gravity: 0.9,
      scalar: 0.9,
      ticks: 180,
      origin,
      colors: ["#fb923c", "#fdba74", "#f8fafc", "#7dd3fc", "#334155"],
      zIndex: 100,
    });
  });
}

export default function Home() {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [calculation, setCalculation] = useState("");
  const [lastOperation, setLastOperation] = useState<{
    operator: Operator;
    operand: number;
  } | null>(null);

  const clear = useCallback(() => {
    setDisplay("0");
    setAccumulator(null);
    setPendingOperator(null);
    setWaitingForOperand(false);
    setCalculation("");
    setLastOperation(null);
  }, []);

  const inputDigit = useCallback(
    (digit: string) => {
      if (display === "Error" || waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
        if (display === "Error") {
          setAccumulator(null);
          setPendingOperator(null);
          setCalculation("");
        }
        return;
      }

      setDisplay((current) =>
        current === "0" ? digit : `${current}${digit}`.slice(0, 14),
      );
    },
    [display, waitingForOperand],
  );

  const inputDecimal = useCallback(() => {
    if (display === "Error") {
      clear();
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }

    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }

    if (!display.includes(".")) {
      setDisplay((current) => `${current}.`);
    }
  }, [clear, display, waitingForOperand]);

  const chooseOperator = useCallback(
    (operator: Operator) => {
      if (display === "Error") {
        clear();
        return;
      }

      const inputValue = Number(display);
      let nextAccumulator = accumulator;

      if (nextAccumulator === null) {
        nextAccumulator = inputValue;
      } else if (pendingOperator && !waitingForOperand) {
        const result = calculate(nextAccumulator, inputValue, pendingOperator);
        const formatted = formatResult(result);
        setDisplay(formatted);

        if (formatted === "Error") {
          setCalculation("Cannot divide by zero");
          setAccumulator(null);
          setPendingOperator(null);
          setWaitingForOperand(true);
          return;
        }
        nextAccumulator = result;
      }

      setAccumulator(nextAccumulator);
      setPendingOperator(operator);
      setWaitingForOperand(true);
      setLastOperation(null);
      setCalculation(`${formatResult(nextAccumulator)} ${operatorSymbols[operator]}`);
    },
    [accumulator, clear, display, pendingOperator, waitingForOperand],
  );

  const equals = useCallback((origin?: { x: number; y: number }) => {
    if (display === "Error") return;

    if (pendingOperator && accumulator !== null && !waitingForOperand) {
      const rightOperand = Number(display);
      const result = calculate(accumulator, rightOperand, pendingOperator);
      const formatted = formatResult(result);

      setCalculation(
        formatted === "Error"
          ? "Cannot divide by zero"
          : `${formatResult(accumulator)} ${operatorSymbols[pendingOperator]} ${formatResult(rightOperand)} =`,
      );
      setDisplay(formatted);
      setLastOperation(
        formatted === "Error"
          ? null
          : { operator: pendingOperator, operand: rightOperand },
      );
      setAccumulator(null);
      setPendingOperator(null);
      setWaitingForOperand(true);
      if (formatted !== "Error") celebrate(origin);
      return;
    }

    if (lastOperation) {
      const leftOperand = Number(display);
      const result = calculate(
        leftOperand,
        lastOperation.operand,
        lastOperation.operator,
      );
      const formatted = formatResult(result);
      setCalculation(
        `${formatResult(leftOperand)} ${operatorSymbols[lastOperation.operator]} ${formatResult(lastOperation.operand)} =`,
      );
      setDisplay(formatted);
      setWaitingForOperand(true);
      if (formatted !== "Error") celebrate(origin);
    }
  }, [
    accumulator,
    display,
    lastOperation,
    pendingOperator,
    waitingForOperand,
  ]);

  const toggleSign = useCallback(() => {
    if (display === "Error" || display === "0") return;
    setDisplay((current) =>
      current.startsWith("-") ? current.slice(1) : `-${current}`,
    );
  }, [display]);

  const percent = useCallback(() => {
    if (display === "Error") return;
    const result = formatResult(Number(display) / 100);
    setDisplay(result);
    setCalculation(`${display}%`);
    setWaitingForOperand(false);
  }, [display]);

  const backspace = useCallback(() => {
    if (display === "Error" || waitingForOperand) return;
    setDisplay((current) => {
      if (current.length <= 1 || (current.length === 2 && current.startsWith("-"))) {
        return "0";
      }
      return current.slice(0, -1);
    });
  }, [display, waitingForOperand]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) inputDigit(event.key);
      else if (event.key === ".") inputDecimal();
      else if (event.key === "+") chooseOperator("add");
      else if (event.key === "-") chooseOperator("subtract");
      else if (event.key === "*") chooseOperator("multiply");
      else if (event.key === "/") chooseOperator("divide");
      else if (event.key === "Enter" || event.key === "=") equals();
      else if (event.key === "Escape" || event.key.toLowerCase() === "c") clear();
      else if (event.key === "Backspace") backspace();
      else if (event.key === "%") percent();
      else return;

      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    backspace,
    chooseOperator,
    clear,
    equals,
    inputDecimal,
    inputDigit,
    percent,
  ]);

  const keyClass =
    "h-14 rounded-2xl text-lg font-semibold shadow-none transition duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:h-16";
  const numberClass =
    "border border-white/8 bg-white/[0.07] text-white hover:bg-white/[0.13]";
  const operatorClass =
    "border border-orange-300/20 bg-orange-400/12 text-orange-300 hover:bg-orange-400/20 aria-pressed:bg-orange-400 aria-pressed:text-slate-950";

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f3f0e9] px-5 py-8 text-slate-950">
      <div
        className="pointer-events-none absolute -left-28 top-12 size-72 rounded-full bg-orange-300/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-sky-300/25 blur-3xl"
        aria-hidden="true"
      />

      <section className="relative w-full max-w-[390px]" aria-labelledby="calculator-title">
        <header className="mb-5 flex items-end justify-between px-1">
          <div>
            <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-orange-700">
              Yast Agency
            </p>
            <h1
              id="calculator-title"
              className="text-2xl font-semibold tracking-[-0.04em]"
            >
              Simple calculator
            </h1>
          </div>
          <span className="rounded-full border border-slate-900/10 bg-white/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Utility 01
          </span>
        </header>

        <div className="rounded-[2rem] border border-white/15 bg-[#121923] p-4 shadow-[0_28px_70px_-25px_rgba(15,23,42,0.58)] sm:p-5">
          <div className="mb-4 flex min-h-32 flex-col items-end justify-end overflow-hidden rounded-[1.4rem] border border-white/8 bg-black/20 px-5 py-4 text-right">
            <p
              className="min-h-5 max-w-full truncate font-mono text-xs tracking-wide text-slate-400"
              aria-live="polite"
            >
              {calculation || "Ready"}
            </p>
            <output
              aria-label={`Calculator display: ${display}`}
              aria-live="polite"
              className={cn(
                "mt-2 block max-w-full truncate font-mono text-[clamp(2.25rem,12vw,3.4rem)] font-medium leading-none tracking-[-0.065em] text-white",
                display === "Error" && "text-orange-300",
              )}
            >
              {display}
            </output>
          </div>

          <div className="grid grid-cols-4 gap-2.5" aria-label="Calculator keypad">
            <Button
              type="button"
              variant="ghost"
              className={cn(keyClass, "bg-white/12 text-orange-200 hover:bg-white/18")}
              onClick={clear}
              aria-label="Clear calculator"
            >
              <RotateCcw aria-hidden="true" />
              <span className="sr-only">Clear</span>
              AC
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn(keyClass, numberClass)}
              onClick={toggleSign}
              aria-label="Toggle positive or negative"
            >
              +/−
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn(keyClass, numberClass)}
              onClick={percent}
              aria-label="Convert to percentage"
            >
              %
            </Button>
            <OperatorButton
              operator="divide"
              pendingOperator={pendingOperator}
              onClick={chooseOperator}
              className={cn(keyClass, operatorClass)}
            />

            {numberKeys.slice(0, 3).map((key) => (
              <NumberButton key={key.value} {...key} onClick={inputDigit} className={cn(keyClass, numberClass)} />
            ))}
            <OperatorButton
              operator="multiply"
              pendingOperator={pendingOperator}
              onClick={chooseOperator}
              className={cn(keyClass, operatorClass)}
            />

            {numberKeys.slice(3, 6).map((key) => (
              <NumberButton key={key.value} {...key} onClick={inputDigit} className={cn(keyClass, numberClass)} />
            ))}
            <OperatorButton
              operator="subtract"
              pendingOperator={pendingOperator}
              onClick={chooseOperator}
              className={cn(keyClass, operatorClass)}
            />

            {numberKeys.slice(6, 9).map((key) => (
              <NumberButton key={key.value} {...key} onClick={inputDigit} className={cn(keyClass, numberClass)} />
            ))}
            <OperatorButton
              operator="add"
              pendingOperator={pendingOperator}
              onClick={chooseOperator}
              className={cn(keyClass, operatorClass)}
            />

            <Button
              type="button"
              variant="ghost"
              className={cn(keyClass, numberClass)}
              onClick={backspace}
              aria-label="Delete last digit"
            >
              <Delete className="size-5" aria-hidden="true" />
            </Button>
            <NumberButton
              value="0"
              label="0"
              onClick={inputDigit}
              className={cn(keyClass, numberClass)}
            />
            <Button
              type="button"
              variant="ghost"
              className={cn(keyClass, numberClass)}
              onClick={inputDecimal}
              aria-label="Decimal point"
            >
              .
            </Button>
            <Button
              type="button"
              className={cn(
                keyClass,
                "bg-orange-400 text-xl text-slate-950 hover:bg-orange-300",
              )}
              onClick={(event) =>
                equals({
                  x: event.clientX / window.innerWidth,
                  y: event.clientY / window.innerHeight,
                })
              }
              aria-label="Calculate result"
            >
              =
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Tip: use your keyboard for faster calculations.
        </p>
      </section>
    </main>
  );
}

function NumberButton({
  value,
  label,
  onClick,
  className,
}: {
  value: string;
  label: string;
  onClick: (value: string) => void;
  className: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={() => onClick(value)}
      aria-label={label}
    >
      {label}
    </Button>
  );
}

function OperatorButton({
  operator,
  pendingOperator,
  onClick,
  className,
}: {
  operator: Operator;
  pendingOperator: Operator | null;
  onClick: (operator: Operator) => void;
  className: string;
}) {
  const symbol = operatorSymbols[operator];

  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={() => onClick(operator)}
      aria-label={`${operator} operation`}
      aria-pressed={pendingOperator === operator}
    >
      {symbol}
    </Button>
  );
}
